const ProgressBar = require('progress');

const INDENT = '\n       ';

class Bar {
  constructor({
    queues
  }) {
    this.updateTimeout = setInterval(this.update.bind(this), 1000);
    this.queues = queues;

    this.bar = new ProgressBar(`
fetching [:bar] :current/:total :percent
Currently Fetching: :fetching
Block Status:       :blocked
Queued:             :queued
Fetched:            :fetched
Failed:             :failed
  `, {
      total: 1
    });

  }

  getBlockedQueues() {
    return Object.entries(this.queues).reduce((out, [name, queue]) => {
      if (queue.block) {
        out[name] = queue.blockEnd;
      }
      return out;
    }, {});
  }

  getStatusCount(status) {
    return Object.entries(this.queues).reduce((out, [name, queue]) => {
      if(queue[status].length) {
        out[name] = queue[status].length;
      }
      return out;
    }, {});
  }

  getStatusCountMessage(status) {
    const counts = this.getStatusCount(status);
    return INDENT + Object.entries(counts)
    
    .map(([ep, count]) => (
      `${ep}: ${count}`
    ))
    .join(INDENT);
  }

  getPromisesForStatus(status) {
    return Object.values(this.queues).reduce((out, queue) => {
      return [
        out,
        ...queue.getPromises(),
      ];
    }, []);
  }

  getPromiseName(promise) {
    return Object.values(this.queues).reduce((out, queue) => {
      if (out) return out;

      const name = queue.getPromiseName(promise);
      if (name) {
        return name;
      }
    }, null);
  }

  // sets the message in the status bar (updates once a second)
  update() {
    // wait until we have a queue
    if (!Object.values(this.queues).length) return;

    console.log(this.queues)

    // blocked endpoints
    const blocks = Object.entries(this.getBlockedQueues())
      .map(([queueName, endBlock]) => {
        const secs = (endBlock - new Date()) / 1000;
        if (secs > 0) {
          return `${queueName} ${parseInt((secs / 60), 10)}m ${parseInt(secs % 60, 10)}s left`;
        }
        return '';
      })
      .filter(t => t)
      .join(INDENT);

    const complete = this.getStatusCountMessage('complete');
    const queued = this.getStatusCountMessage('queued');
    const pending = this.getPromisesForStatus('pending');
    const failed = this.getStatusCountMessage('failed');

    // clears the screen so that the progress bar isn't scrolling text
    // console.clear();

    // this.bar.total = this.getQueuesTotals();
    console.log('total', this.getQueuesTotals())

    this.bar.tick(0, {
      fetching: pending.length
          ? pending.map(this.getPromiseName.bind(this)).join(INDENT)
          : 'None',
      blocked: blocks || 'All Endpoints Unblocked',
      fetched: complete,
      failed: failed.length,
      queued: queued.length,
    });
  }

  getQueuesTotals() {
    return Object.values(this.queues).reduce((total, queue) => {
      return total + queue.getTotal();
    }, 0)
  }

  listenToQueues(queues) {
    Object.entries(queues).forEach((name, queue) => {
      this.listenToQueue(queue, name);
    });
  }

  listenToQueue(queue, name) {
    queue.on('event')
  }

  removeBar() {
    clearInterval(this.updateTimeout);
  }
}

module.exports = Bar;