class Queue {
    static allEvents = [
        'queued',
        'start',
        'resolved',
        'complete',
        'failed',
        'blocked',
        'unblocked',
    ]

    queued = []

    pending = []

    complete = []

    failed = []

    maxConcurrent = Infinity

    eventListeners = {}

    // await this for the unblock
    block = null

    // call this to unblock
    unblock = null

    constructor({
        maxConcurrent = Infinity,
        retry = false,
        retryTimes = 3,
        retryWaitTime = 0
    }) {
        Object.assign(this, {
            maxConcurrent,
            retry,
            maxRetries,
            retryWaitTime,
        });

        this.initializeEvents();
    }
    
    initializeEvents() {
        this.eventListeners = Queue.allEvents.reduce((listeners, event) => {
            listeners[event] = [];
            return listeners;
        }, {});
    }

    triggerEvent(event, promise) {
        this.eventListeners[event].forEach((cb) => {
            cb(promise);
        });
    }

    add(func) {
        const promise = new Promise((resolve) => {
            this.queue.push(async () => {
                const result = await func();
                resolve(result);
                return result;
            });

            this.triggerEvent('queued', promise);
        });

        return promise;
    }

    moveLists(item, from, to) {
        this[to].push(item);
        this[from].splice(this[from].indexOf(item));
    }

    async processNextItem () {
        if (this.block) {
            await this.block;
        }

        if (this.pending.length <= this.maxConcurrent) {
            const promise = this.queued[0]();
            this.moveLists(promise, 'queued', 'pending');
            this.triggerEvent('pending', promise);
            
            promise.then(() => {
                this.moveLists(promise, 'pending', 'complete');
                this.triggerEvent('complete', promise);
            }).catch(async () => {
                if (this.retry) {
                    let tryNumber = 0;

                    while (tryNumber < this.maxRetries) {
                        this.processNextItem();
                    }
                }
                
                this.moveLists(promise, 'pending', 'failed');
                this.triggerEvent('failed', promise);
            });
        } else {
            // wait for something to succeed or fail
            await Promise.race(this.pending);
        }
    }

    async process() {
        while(this.queued.length) {
            this.processNextItem();
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

        this.pending.forEach((promise) => {
            this.triggerEvent('blocked', promise);
        });

        if (unblockIn) {
            setTimeout(this.unblockQueue, unblockIn);
        }

        return block;
    }

    unblockQueue() {
        if(!this.unblock) throw Error('Queue is not blocked');

        this.unblock();

        delete this.unblock;

        this.pending.forEach((promise) => {
            this.triggerEvent('unblocked', promise);
        });
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
}

module.exports = Queue;