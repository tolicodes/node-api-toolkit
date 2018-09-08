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

            eventListeners: {},

            // await this for the unblock
            block: null,
            // call this to unblock
            unblock: null,

            // maps promises to their names
            promiseNameMap: [],

            stopped: true,
            
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

    add(func, { name } = {}) {
        const promise = new Promise((resolve) => {
            this.queued.push(async () => {
                const result = await func();

                resolve(result);
                return result;
            });
        });

        this.triggerEvent('queued', promise);

        if (name) {
            this.promiseNameMap.push([name, promise]);
        }

        setTimeout(() => {
            if (this.stopped) {
                this.process();
            }
        })

        return promise;
    }

    getPromiseName(p) {
        const promiseMap = this.promiseNameMap.find(([, promise]) => promise === p);
        if (promiseMap) { return promiseMap[0] }
    }

    moveLists(item, from, to) {
        this[to].push(item);
        this[from].splice(this[from].indexOf(item));
    }

    async processNextItem(tryNumber = 0) {
        if (this.block) {
            await this.block;
        }

        if (this.waitBetweenRequests) {
            await wait(this.waitBetweenRequests);
        }

        if(!this.queued.length) { return }

        if (this.pending.length <= this.maxConcurrent) {
            const promise = this.queued[0]();
            this.moveLists(promise, 'queued', 'pending');
            this.triggerEvent('pending', promise);

            promise.then(() => {
                this.moveLists(promise, 'pending', 'complete');
                this.triggerEvent('complete', promise);
            }).catch(async (e) => {
                if (this.retry) {
                    while (tryNumber < this.maxRetries) {
                        console.log(tryNumber)
                        const res = await this.processNextItem(tryNumber);

                        if(res) return;
                    }
                }

                this.moveLists(promise, 'pending', 'failed');
                this.triggerEvent('failed', promise);
                
                // throw e;
            });

            // process next
            return true;
        } else {
            // wait for something to succeed or fail
            return Promise.race(this.pending);
        }
    }

    async process() {
        while (this.queued.length) {
            await this.processNextItem();
        }

        return Promise.all(this.pending)
    }

    // returns a promise to be `await`ed
    complete() {
        if (!this.queued.length && !this.pending.length) {
            return true;
        } else {
            return Promise.all([
                ...this.pending,
                ...this.queued,
            ]);
        }
    }

    on(event, cb) {
        if (event === 'all') {
            Queue.allEvents.forEach(event => {
                this.listeners[event].push(cb);
            });
        } else {
            this.listeners[event].push(cb);
        }
    }

    blockQueue(unblockIn) {
        this.block = new Promise((resolve) => {
            this.unblock = resolve;
        });

        this.blockEnd = new Date() + unblockIn;

        this.pending.forEach((promise) => {
            this.triggerEvent('blocked', promise);
        });

        if (unblockIn) {
            setTimeout(this.unblockQueue, unblockIn);
        }

        return block;
    }

    unblockQueue() {
        if (!this.unblock) throw Error('Queue is not blocked');

        this.unblock();

        delete this.unblock;
        delete this.block;
        delete this.blockEnd;

        this.pending.forEach((promise) => {
            this.triggerEvent('unblocked', promise);
        });
    }

    getPromises() {
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
            this.getNumberQueued() +
            this.getNumberPending() +
            this.getNumberComplete() +
            this.getNumberFailed()
        );
    }
}

module.exports = Queue;