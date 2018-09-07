const Queue = require('./components/queue');
const Bar = require('./components/bar');

module.exports = {
    createQueue: (opts) => new Queue(opts),
    createProgressBar: (opts) => new Bar(opts),
}