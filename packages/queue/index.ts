import moment = require("moment");
import wait from "@node-api-toolkit/wait";
const debug = require("debug");

import { createTmpFile, writeTmpFile, readTmpFile } from "./writeTmpFile";

enum QueueEvent {
  // added to queue, waiting to start
  "queued" = "queued",

  // function started running
  "start" = "start",

  // function finished running successfully
  "complete" = "complete",

  // function failed running (including retries)
  "failed" = "failed",

  // the function just got blocked from running (the queue is paused)
  "blocked" = "blocked",

  // the function just got unblocked and is running
  "unblocked" = "unblocked",
}

enum FunctionState {
  // added, waiting to run
  "queued" = "queued",

  // function started running
  "pending" = "pending",

  // function finished running successfully
  "complete" = "complete",

  // function failed running (including retries)
  "failed" = "failed",
}

type QueueOpts = {
  maxConcurrent?: number;
  retry?: boolean;
  maxRetries?: number;
  waitBetweenRequests?: number;
  autoStart?: boolean;
  tmpFile?: string;
};

// the function that's called when an event happens
type QueueEventCallback = (
  queueEvent: QueueEvent,
  promise: Promise<any>
) => void;

// list for queued, failed, pending, other states
type PromiseListForState = Promise<any>[];

const QUEUE_EVENTS = Object.keys(QueueEvent);

export default class Queue {
  // LISTS FOR FUNCTION STATES

  /**
   * array holding Promises in a queued state
   */
  public queuedPromises: PromiseListForState = [];

  /**
   * array holding Promises in a pending state
   */
  public pendingPromises: PromiseListForState = [];

  /**
   * array holding Promises in a complete state
   */
  public completePromises: PromiseListForState = [];

  /**
   * array holding Promises in a failed state
   */
  public failedPromises: PromiseListForState = [];

  // BLOCKS
  /**
   * This Promise is resolved when the queue is unblocked
   * (continues running). Await this to know when the queue is unblocked
   */
  public blockPromise: Promise<void>;

  /**
   * Is the queue currently blocked
   */
  public blocked: boolean = false;

  /**
   * When does the current block end
   */
  public blockEnd: moment.Moment;

  /**
   * Is the queue currently stopped
   */
  public stopped: boolean = true;

  /**
   * Should the queue automatically start when a function is added
   */
  public autoStart: boolean = true;

  // OPTIONS
  /**
   * How many functions can be processing at once
   */
  private maxConcurrent: number;

  /**
   * How long should the wait be between function runs
   */
  private waitBetweenFunctionRuns: number;

  // Retry Options
  /**
   * Should the function retry if it fails
   */
  private retry: boolean;

  /**
   * How many times should the function retry if it fails
   */
  private maxRetries: number;

  /**
   * tmp file that the records are saved under in case there is an error
   */
  private tmpFile: string;

  // PRIVATE PROPERTIES
  /**
   * Maps a state to a promise array
   */
  private stateToArrayMap = {
    queued: this.queuedPromises,
    pending: this.pendingPromises,
    complete: this.completePromises,
    failed: this.failedPromises,
  };

  /**
   * This is a list of functions that are currently queued. Should be
   * in the same order as the queuedPromises list
   */
  private queuedFuncs: Function[] = [];

  /**
   * A map of all the states containing an array of listeners for each state
   */
  private eventListeners: { [event in QueueEvent]: QueueEventCallback[] } = {
    queued: [],
    start: [],
    complete: [],
    failed: [],
    blocked: [],
    unblocked: [],
  };

  /**
   * Map of the name of the function to its corresponding Promise
   * The purpose is if we want some kind of reporting on running
   * functions
   */
  private promiseNameMap: [string, Promise<any>][] = [];

  /**
   * Contains the function to clear the current block timeout
   * Should only be used internally to set a new timeout
   */
  private clearBlockTimeout: () => void;

  private debug = debug("@node-api-toolkit/queue");

  /**
   * Sets the options for the queue
   * @param param0.maxConcurrent - How many functions can be processing at once
   * @param param0.retry - Should the function retry if it fails
   * @param param0.maxRetries - How many times should the function retry if it fails
   * @param param0.waitBetweenFunctionRuns - How long should the wait be between function runs
   * @param param0.autoStart - Should the queue automatically start when a function is added
   */
  constructor({
    maxConcurrent = 1,
    retry = false,
    maxRetries = 3,
    waitBetweenRequests = 1000,
    autoStart = true,
    tmpFile,
  }: QueueOpts = {}) {
    this.maxConcurrent = maxConcurrent;
    this.retry = retry;
    this.maxRetries = maxRetries;
    this.waitBetweenFunctionRuns = waitBetweenRequests;
    this.autoStart = autoStart;

    this.initTmpFile(tmpFile);
  }

  /**
   * A promise wrapping the function will be added to the queue immediately after
   * calling this method. But the `func` passed will only start executing when
   * `process` is called on the queue. The promise will resolve when the function
   * completes executing
   * @param func
   * @param param1.name - The name of the function, so that it can be easily referred to
   */
  public add(func: Function, { name }: { name?: string } = {}): Promise<any> {
    let resolve;

    // we export the resolve function so that we can do it below (can't self reference it)
    const wrapperPromise = new Promise((r) => {
      resolve = r;
    });

    // you have the ability to name a function you add so that you can reference it using
    // a progress bar or debug info
    if (name) {
      this.promiseNameMap.push([name, wrapperPromise]);
    }

    this.debug(`Adding new function "${name}"`);

    this.queuedPromises.push(wrapperPromise);
    this.triggerEvent(QueueEvent.queued, wrapperPromise);

    // this stores wrapped functions. They will be shifted
    // off the queue as they're executed. We wrap them so that we can
    // also resolve the wrapping Promise
    this.queuedFuncs.push(async () => {
      const result = await func();

      this.debug(`Function "${name}" resolved`);
      resolve(result);
      return result;
    });

    setTimeout(() => {
      // if the queue is stopped (or not started) and autoStart is enabled
      // then we can just start processing the queue
      if (this.stopped && this.autoStart) {
        this.debug("Auto-starting queue");
        this.process();
      }
    });

    return wrapperPromise;
  }

  /**
   * Processes the queue
   * @returns all the results when finished
   */
  public async process() {
    this.stopped = false;
    this.debug("Starting processing");
    while (this.queuedFuncs.length) {
      this.debug("Processing next item");
      await this.processNextItem();
    }

    // we have to do this because a promise may
    // be added right before the last promise is
    // resolved. So we have to keep checking at
    // each resolution if new promises have been
    // added
    let hasPendingPromises = true;
    while (hasPendingPromises) {
      // wait for everything pending to finish
      await Promise.all([...this.pendingPromises, ...this.queuedPromises]);
      if (!this.pendingPromises.length) {
        hasPendingPromises = false;
      }
    }

    // stop the queue
    this.debug("Processing complete. Stopping queue");
    this.stopped = true;
  }

  /**
   * Gets the name of a promise
   * @param promise - the promise who's name to get
   */
  public getPromiseName(promise: Promise<any>): string {
    const promiseMap = this.promiseNameMap.find(([, p]) => p === promise);

    // the 0th key is the name
    return promiseMap && promiseMap[0];
  }

  /**
   * Await this function to know when the queue finishes running
   */
  public async isDone(): Promise<any[]> {
    // if there are no queued or pending promises, we are done
    if (!this.queuedPromises.length && !this.pendingPromises.length) {
      this.debug("No more pending or queued promises. Queue is done running");

      // return the results of the promises
      return Promise.all(this.completePromises);
    }

    // wait for all the current pending and queued promises to finish
    await Promise.all([...this.pendingPromises, ...this.queuedPromises]);

    // check if we have any new promises
    return this.isDone();
  }

  public then() {
    return this.isDone();
  }

  /**
   * Listen to an event
   * @param event The event you want to listen to. Can also pass 'all'
   * if you want to listen to all events
   * @param cb The callback for when the event happens
   *
   * @returns this queue for chaining purposes
   */
  public on(event: QueueEvent | "all", cb: QueueEventCallback): Queue {
    // if we want to listen to all events then we
    // add the callback
    if (event === "all") {
      QUEUE_EVENTS.forEach((e) => {
        this.eventListeners[e].push(cb);
      });
    } else {
      this.eventListeners[event].push(cb);
    }

    return this;
  }

  /**
   * Blocks the queue from processing until it's unblocked
   * Use `unblockQueue` to unblock or wait for timeout
   * @param unblockIn (optional) Milliseconds to unblock in or don't pass to
   * block indefinitely
   * @returns The promise that is currently blocking the queue
   */
  public blockQueue(unblockIn?: number) {
    // if it's already blocked just reset the timeout
    // and return that same blockPromise
    if (this.blocked && this.blockPromise) {
      if (unblockIn) {
        this.setUnblockTimeoutIn(unblockIn);
      } else {
        // clears the timeout and now the queue is blocked indefinitely
        this.clearBlockTimeout();
      }
      return this.blockPromise;
    }

    this.pendingPromises.forEach((promise) => {
      this.triggerEvent(QueueEvent.blocked, promise);
    });

    this.blocked = true;

    if (unblockIn) {
      this.setUnblockTimeoutIn(unblockIn);
    }

    // the queue is listening to this promise to know when
    // to continue running
    this.blockPromise = new Promise((resolve) => {
      // the unblock function will unblock the queue
      this.unblockQueue = () => {
        delete this.unblockQueue;
        delete this.blockEnd;

        this.blocked = false;

        // we want them to start processing before
        // the event fires
        resolve();

        this.pendingPromises.forEach((promise) => {
          this.triggerEvent(QueueEvent.unblocked, promise);
        });
      };
    });

    return this.blockPromise;
  }

  /**
   * Unblocks the queue
   */
  public unblockQueue: () => void;

  /**
   * Set timeout for when to unblock the queue
   * @param unblockIn Milliseconds until the queue is unblocked
   */
  public setUnblockTimeoutIn(unblockIn: number): void {
    if (!unblockIn || unblockIn < 0) return;

    // If there is an existing unblock timeout we clear it
    if (this.clearBlockTimeout) {
      this.clearBlockTimeout();
    }

    // the timeout which will unblock the queue
    const timeout = setTimeout(this.unblockQueue, unblockIn);

    // function to clear the current timeout
    this.clearBlockTimeout = () => {
      clearTimeout(timeout);
      delete this.clearBlockTimeout;
    };

    // time when the block ends
    this.blockEnd = moment().add(unblockIn, "ms");
  }

  /**
   * Gets the promises for a state
   * @param status (optional) For which state do you want the promises. Pass
   * no argument to get all the promises
   * @return List of promises for that state
   */
  public getPromises(state?: FunctionState): PromiseListForState {
    if (state) {
      return this.stateToArrayMap[state];
    }

    return [
      ...this.queuedPromises,
      ...this.pendingPromises,
      ...this.completePromises,
      ...this.failedPromises,
    ];
  }

  /**
   * Gets the number of queued functions
   * @return number of queued functions
   */
  public getNumberQueued(): number {
    return this.queuedPromises.length;
  }

  /**
   * Gets the number of pending functions
   * @return number of pending functions
   */
  public getNumberPending(): number {
    return this.pendingPromises.length;
  }

  /**
   * Gets the number of complete functions
   * @return number of complete functions
   */
  public getNumberComplete(): number {
    return this.completePromises.length;
  }

  /**
   * Gets the number of failed functions
   * @return number of failed functions
   */
  public getNumberFailed(): number {
    return this.failedPromises.length;
  }

  /**
   * Gets the total number of functions in the queue
   * @return number of failed functions
   */
  public getTotal(): number {
    return (
      this.getNumberQueued() +
      this.getNumberPending() +
      this.getNumberComplete() +
      this.getNumberFailed()
    );
  }

  /**
   * Gets the temp file path
   */
  public getTmpFile() {
    return this.tmpFile;
  }

  // PRIVATE METHODS

  /**
   * Triggers an event on a promise (all listeners for that event are notified)
   * @param event - The event that happened
   * @param promise - The promise that this was triggered on
   */
  private triggerEvent(event: QueueEvent, promise: Promise<any>): void {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event].forEach((cb) => {
      cb(event, promise);
    });
  }

  /**
   * Changes the state of the promise
   * @param promise The promise to move
   * @param from Previous state
   * @param to New state
   */
  private changeState(
    promise: Promise<any>,
    from: FunctionState,
    to: FunctionState
  ): void {
    const fromList = this.stateToArrayMap[from];
    const toList = this.stateToArrayMap[to];

    if (!fromList.includes(promise)) {
      throw Error(
        `Function "${this.getPromiseName(promise)}" is not in list ${from}`
      );
    }

    // add promise to new list
    toList.push(promise);

    // delete promise from old list
    fromList.splice(fromList.indexOf(promise), 1);
  }

  /**
   * Runs the function
   * @param func The function to run
   * @param promise The promise representing the function
   * @param tryNumber How many times have we tried to run the function
   *
   * @returns Succeeded (true/false)
   */
  private async runFunction(
    func: Function,
    promise: Promise<any>,
    tryNumber: number = 0
  ): Promise<boolean> {
    const functionName = this.getPromiseName(promise);
    if (this.waitBetweenFunctionRuns) {
      this.debug(
        `Waiting to start function - ${this.waitBetweenFunctionRuns}ms`
      );
      await wait(this.waitBetweenFunctionRuns);
    }

    // if a function is running we wait for it to finish
    if (this.blocked) {
      this.debug(`Queue is blocked`);
      await this.blockPromise;
      this.debug(`Queue is unblocked`);
    }

    // try to run the function and retry if it fails
    try {
      const data = await func();

      writeTmpFile({
        path: this.tmpFile,
        data,
      });

      this.debug(`Function completed "${functionName}"`);
      this.changeState(promise, FunctionState.pending, FunctionState.complete);
      this.triggerEvent(QueueEvent.complete, promise);
    } catch (e) {
      this.debug(`Function failed running "${functionName}"`);
      if (this.retry && tryNumber < this.maxRetries) {
        this.debug(
          `Function "${functionName}" failed. Retrying function . Try # ${tryNumber}`
        );
        const res = await this.runFunction(func, promise, tryNumber + 1);

        if (res) return true;
      }

      this.debug(`Function "${functionName}" failed. Not retrying`);
      this.changeState(promise, FunctionState.pending, FunctionState.failed);
      this.triggerEvent(QueueEvent.failed, promise);

      e.tmpFile = this.tmpFile;

      throw e;
    }

    return true;
  }

  /**
   * Processes next item in the queue
   * @returns true is there is another item pending or false if there
   * are no more pending items
   */
  private async processNextItem(): Promise<boolean> {
    // if we can process more concurrent items than are currently running
    if (this.pendingPromises.length < this.maxConcurrent) {
      // if there are no more queued items then we can stop processing
      if (!this.queuedPromises.length) {
        this.debug("Finished processing");
        return false;
      }

      // take the first promise and move it to pending
      const promise = this.queuedPromises[0];
      this.changeState(promise, FunctionState.queued, FunctionState.pending);

      // run the function corresponding to that promise
      const functionToRun = this.queuedFuncs.shift();
      this.debug(`Running function "${this.getPromiseName(promise)}"`);
      this.runFunction(functionToRun, promise);

      // process next
      return true;
    }

    this.debug(
      `Reached max concurrent "${this.maxConcurrent}". Waiting for completion`
    );
    // wait for something to succeed or fail
    await Promise.race(this.pendingPromises);

    // keep processing!
    return true;
  }

  /**
   * If a tmpFile is given, load it and set it
   * Otherwise create a new one
   * @param tmpFile
   */
  private async initTmpFile(tmpFile) {
    if (tmpFile) {
      this.tmpFile = tmpFile;
      const data = await readTmpFile({ path: tmpFile });
      // console.log(data);
      return;
    }

    this.tmpFile = createTmpFile();
  }
}
