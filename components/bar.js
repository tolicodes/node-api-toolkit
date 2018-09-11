const term = require('terminal-kit').terminal;
const moment = require('moment');

const STATUSES = [
  'pending',
  'blocked',
  'queued',
  'complete',
  'failed',
];

class Bar {
  constructor({
    queues,
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
        color: term.blue,
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
      },
      total: {
        label: 'Total',
        color: term.black,
      },
    };
  }

  getBlockedQueues() {
    return Object.entries(this.queues).reduce((out, [name, queue]) => {
      if (queue.blocked && queue.blockEnd) {
        out[name] = queue.blockEnd;
      }
      return out;
    }, {});
  }

  getStatusCount(status) {
    return Object.entries(this.queues).reduce((out, [, queue]) => {
      if (queue[status].length) {
        return out + queue[status].length;
      }
      return out;
    }, 0);
  }

  getStatusCounts(status) {
    return Object.entries(this.queues).reduce((out, [ep, queue]) => {
      out[ep] = queue[status].length;
      return out;
    }, {});
  }

  getCompleteMessage() {
    return Object.entries(this.queues)
      .map(([ep, queue]) => `${ep}: ${queue.complete.length}/${queue.getTotal()}`)
      .join(`\n${this.indent}`);
  }

  getPromisesForStatus(status) {
    return Object.values(this.queues).reduce((out, queue) => [
      ...out,
      ...queue.getPromises(status),
    ], []);
  }

  getPromiseName(promise) {
    return Object.values(this.queues).reduce((out, queue) => {
      if (out) return out;

      return queue.getPromiseName(promise);
    }, null);
  }

  // eslint-disable-next-line
  formatDuration(ms) {
    return moment.utc(ms).format('HH:mm:ss');
  }

  // sets the message in the status bar (updates once a second)
  update() {
    // wait until we have a queue
    if (!Object.values(this.queues).length) return;

    // blocked endpoints
    const blocks = Object.entries(this.getBlockedQueues())
      .map(([queueName, blockEnd]) => {
        const left = this.formatDuration(moment(blockEnd).diff(moment()));
        return `${queueName} ${left} left`;
      })
      .filter(t => t)
      .join(`\n${this.indent}`);

    const pendingPromises = this.getPromisesForStatus('pending');
    const pendingMessage = pendingPromises.length
      ? pendingPromises
        .map(p => this.getPromiseName(p))
        .join(`\n${this.indent}`)
      : 'None';

    const messages = {
      pending: pendingMessage,
      blocked: blocks || 'All Endpoints Unblocked',
      queued: this.getStatusCount('queued'),
      complete: this.getCompleteMessage('complete'),
      failed: this.getStatusCount('failed'),
      total: this.getQueuesTotals(),
    };

    // term.clear();

    STATUSES.forEach((status) => {
      const { color, label } = this.statuses[status];
      const indent = ' '.repeat(this.indent.length - label.length);
      color(`${label + indent + messages[status]}\n`);
    });
  }

  drawBar() {
    const message = '';
    return (
      '[]'
    );
  }

  getQueuesTotals() {
    return Object.values(this.queues).reduce((total, queue) => total + queue.getTotal(), 0);
  }

  listenToQueues(queues) {
    Object.entries(queues).forEach((name, queue) => {
      this.listenToQueue(queue, name);
    });
  }

  listenToQueue(queue, name) {
    queue.on('event');
  }

  removeBar() {
    clearInterval(this.updateTimeout);
  }
}

module.exports = Bar;
