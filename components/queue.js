const moment = require('moment');
const wait = require('../utils/wait');

const ALL_EVENTS = [
  'queued',
  'start',
  'complete',
  'failed',
  'blocked',
  'unblocked',
];

class Queue {
  constructor({
    maxConcurrent = Infinity,
    retry = false,
    maxRetries = 3,
    retryWaitTime = 0,
    waitBetweenRequests = 1000,
    autoStart = true,
  } = {}) {
    Object.assign(this, {
      // Options

      // how many requests can be processing at once
      maxConcurrent,

      // Retry Options
      // enabled/disabled
      retry,
      maxRetries,
      retryWaitTime,
      waitBetweenRequests,

      // lists of promises
      queued: [],
      pending: [],
      complete: [],
      failed: [],

      // unlike queued this is a list of functions, not promises
      queuedFuncs: [],

      eventListeners: {},

      // await this for the unblock
      block: null,
      // call this to unblock
      unblock: null,

      // maps promises to their names
      promiseNameMap: [],

      stopped: true,
      autoStart,
    });


    this.initializeEvents();
  }

  initializeEvents() {
    this.eventListeners = ALL_EVENTS.reduce((listeners, event) => {
      listeners[event] = [];
      return listeners;
    }, {});
  }

  triggerEvent(event, promise) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event].forEach((cb) => {
      cb(promise);
    });
  }

  // there will be a promise added to queued immediately after adding
  // but func will ojnly start executing when `process` is called
  // the wrapper promise will actually be the one that is passed around
  // everywhere
  // the queue will start executing if it's currently stopped if autoStart
  // is enabled;
  add(func, { name } = {}) {
    let resolve;
    let reject;
    const wrapperPromise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    if (name) {
      this.promiseNameMap.push([name, wrapperPromise]);
    }

    this.queued.push(wrapperPromise);
    this.triggerEvent('queued', wrapperPromise);

    this.queuedFuncs.push(() => {
      func().then(resolve).catch(reject);

      return wrapperPromise;
    });

    setTimeout(() => {
      if (this.stopped && this.autoStart) {
        this.process();
      }
    });

    return wrapperPromise;
  }

  getPromiseName(p) {
    const promiseMap = this.promiseNameMap.find(([, promise]) => promise === p);
    return promiseMap && promiseMap[0];
  }

  moveLists(item, from, to) {
    if (!this[from].includes(item)) {
      throw Error(`Promise is not in list ${from}`);
    }

    this[to].push(item);
    this[from].splice(this[from].indexOf(item), 1);
  }

  async processNextItem(tryNumber = 0) {
    if (this.waitBetweenRequests) {
      await wait(this.waitBetweenRequests);
    }

    if (this.pending.length < this.maxConcurrent) {
      if (!this.queued.length) { return false; }
      this.moveLists(this.queued[0], 'queued', 'pending');

      if (this.blocked) {
        await this.block;
      }

      const promise = this.queuedFuncs.shift()();

      promise.then(() => {
        this.moveLists(promise, 'pending', 'complete');
        this.triggerEvent('complete', promise);
      }).catch(async () => {
        // the parent's while will handle retries
        if (tryNumber > 0) return;

        if (this.retry) {
          while (tryNumber < this.maxRetries) {
            const res = await this.processNextItem(tryNumber + 1);

            if (res) return;
          }
        }

        this.moveLists(promise, 'pending', 'failed');
        this.triggerEvent('failed', promise);
      });

      // process next
      return true;
    }
    // wait for something to succeed or fail
    return Promise.race(this.pending);
  }

  async process() {
    for (;this.queuedFuncs.length;) {
      await this.processNextItem();
    }

    return Promise.all(this.pending);
  }

  // returns a promise to be `await`ed
  complete() {
    if (!this.queued.length && !this.pending.length) {
      return true;
    }
    return Promise.all([
      ...this.pending,
      ...this.queued,
    ]);
  }

  on(event, cb) {
    if (event === 'all') {
      ALL_EVENTS.forEach((e) => {
        this.eventListeners[e].push((...args) => cb(e, ...args));
      });
    } else {
      this.eventListeners[event].push(cb);
    }

    return this;
  }

  setUnblockTimeout(unblockIn) {
    if (!unblockIn || unblockIn < 0) return;

    if (this.unblockTimeout) {
      clearTimeout(this.unblockTimeout);
    }

    this.unblockTimeout = setTimeout(() => {
      this.unblockQueue();
    }, unblockIn, 10);

    this.blockEnd = moment().add(unblockIn, 'ms');
  }

  blockQueue(unblockIn) {
    if (this.blocked && this.block) {
      this.setUnblockTimeout(unblockIn);
      return this.block;
    }

    this.pending.forEach((promise) => {
      this.triggerEvent('blocked', promise);
    });

    this.block = new Promise((resolve) => {
      this.unblock = resolve;
      this.blocked = true;
      this.setUnblockTimeout(unblockIn);
    });

    return this.block;
  }

  unblockQueue() {
    if (!this.unblock) return;

    this.unblock();
    this.blocked = false;

    delete this.unblock;
    delete this.blockEnd;

    this.pending.forEach((promise) => {
      this.triggerEvent('unblocked', promise);
    });
  }

  getPromises(status) {
    if (status) {
      return this[status];
    }

    return [
      ...this.queued,
      ...this.pending,
      ...this.complete,
      ...this.failed,
    ];
  }

  getNumberQueued() {
    return this.queued.length;
  }

  getNumberPending() {
    return this.pending.length;
  }

  getNumberComplete() {
    return this.complete.length;
  }

  getNumberFailed() {
    return this.failed.length;
  }

  getTotal() {
    return (
      this.getNumberQueued()
            + this.getNumberPending()
            + this.getNumberComplete()
            + this.getNumberFailed()
    );
  }
}

module.exports = Queue;
