const ProgressBar = require('progress');

// sets the message in the status bar (updates once a second)
const update = () => {
  const indent = '\n       ';

  // blocked endpoints
  const blocks = Object.entries(blockedEndpoints)
    .map(([queueName, endBlock]) => {
      const secs = (endBlock - new Date()) / 1000;
      if (secs > 0) {
        return `${queueName} ${parseInt((secs / 60), 10)}m ${parseInt(secs % 60, 10)}s left`;
      }
      return '';
    })
    .filter(t => t)
    .join(indent);

  // endpoints we have already fetched
  const fetched = indent + Object.entries(fetchedCount)
    .map(([ep, count]) => (
      `${ep}: ${count}`
    ))
    .join(indent);

  // requests that are queued
  const queued = indent + Object.entries(queues)
    .map(([ep, queue]) => `${ep} - ${queue.getQueueLength()} queued | ${queue.getPendingLength()} processing`)
    .join(indent);

  // clears the screen so that the progress bar isn't scrolling text
  console.clear();

  this.tick(0, {
    currentItem: `Currently Fetching: ${indent + (
        currentlyFetching.length
          ? currentlyFetching.join(indent)
          : 'BLOCKED'
      )}`,
    blocked: blocks ? `Blocked Endpoints: ${indent + blocks}` : 'All Endpoints Unblocked',
    fetched,
    queued,
  });
};

const listenToQueues = (queues) => {
  Object.entries(queues).forEach((name, queue) => {
    this.listenToQueue(queue, name);
  });
}

const listenToQueue = (queue, name) => {
  queue.on('event')
}

const removeBar = () => {
  clearInterval(this.updateTimeout);
}

module.exports = ({ queues }) => {
  const bar = new ProgressBar('fetching [:bar] :current/:total :percent \n :currentItem \n :blocked \n Fetched: :fetched \n Queued: :queued \n :messsage');

  bar.updateTimeout = setInterval(this.update, 1000);

  bar.queues = queues;
  bar.update = update;

  return bar;
}