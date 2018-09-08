const term = require('terminal-kit').terminal;

const STATUSES = [
  'pending',
  'blocked',
  'queued',
  'complete',
  'failed',
];

class Bar {
  constructor({
    queues
  }) {
    this.updateTimeout = setInterval(this.update.bind(this), 1000);
    this.queues = queues;

    this.indent = ' '.repeat('Currently Fetching: '.length);

    this.statuses = {
      pending: {
        label: 'Currently Fetching',
        color: term.yellow,
      },
      blocked: {
        label: 'Block Status',
        color: term.magenta,
      },
      queued: {
        label: 'Queued',
        color: term.gray,
      },
      complete: {
        label: 'Fetched',
        color: term.green,
      },
      failed: {
        label: 'Failed',
        color: term.red,
      }
    };
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
    return Object.entries(this.queues).reduce((out, [, queue]) => {
      if(queue[status].length) {
        return out + queue[status].length;
      }
      return out;
    }, 0);
  }

  getStatusCountMessage(status) {
    const counts = this.getStatusCount(status);
    return Object.entries(counts)
    
    .map(([ep, count]) => (
      `${ep}: ${count}`
    ))
    .join(this.indent);
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

      return queue.getPromiseName(promise);
    }, null);
  }

  // sets the message in the status bar (updates once a second)
  update() {
    // wait until we have a queue
    if (!Object.values(this.queues).length) return;

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
      .join(this.indent);

    const pendingPromises = this.getPromisesForStatus('pending')
    const pendingMessage = pendingPromises.length
      ? pendingPromises.map(this.getPromiseName.bind(this)).join(this.indent)
      : 'None';

    const messages = {
      pending: pendingMessage,
      blocked: blocks || 'All Endpoints Unblocked',
      queued: this.getStatusCount('queued'),
      complete: this.getStatusCount('complete'),
      failed: this.getStatusCount('failed'),
    }

    // term.clear();

    // STATUSES.forEach((status) => {
    //   const { color, label } = this.statuses[status];
    //   const indent = ' '.repeat(this.indent.length - label.length);
    //   color(label + indent + messages[status] + '\n');
    // });
  }

  drawBar() {

    const message = ``
    return (
      `[]`
    )
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