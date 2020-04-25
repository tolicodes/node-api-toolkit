const prettyBytes = require("pretty-bytes");
const createDebug = require("debug");
const chalk = require("chalk");

const humanizeDuration = require("humanize-duration");

// for timing stuff
const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: "shortEn",
  languages: {
    shortEn: {
      y: () => "y",
      mo: () => "mo",
      w: () => "w",
      d: () => "d",
      h: () => "h",
      m: () => "m",
      s: () => "s",
      ms: () => "ms",
    },
  },
});

const mapObject = (obj: object, func) =>
  Object.entries(obj).reduce((out, [key, value]) => {
    out[key] = func(value);
    return out;
  }, {});

export const stringMemoryUsage = () =>
  JSON.stringify(mapObject(process.memoryUsage(), prettyBytes));

let previousMemoryUsage = 0;

/**
 * There are two usage modes:
 * 1. Run memoryDiff() and it will return the memory difference since the last run
 * 2. Run const memoryDifferenceForProcess = memoryDiff(true) at the start of a process
 * and memoryDifferenceForProcess() callback at the end of the process to get
 * the memory difference just for that process
 * @param returnFunction Should return a callback to run at the end of the process
 * @param param1.pretty: Prettify (kB, mB, etc)
 */
export const memoryDiff = (returnFunction = false, { pretty = true } = {}) => {
  // used to format the output
  const getMemoryDifference = (initial, end) => {
    const difference = end - initial;
    return pretty ? prettyBytes(difference) : difference;
  };

  // the usage right now
  const usage = process.memoryUsage().heapTotal;

  // if we are returning a function that ends the timer
  if (returnFunction) {
    return () => {
      const newUsage = process.memoryUsage().heapTotal;
      return getMemoryDifference(usage, newUsage);
    };
  }

  // otherwise we just store the current usage to the previous
  // and output the difference
  const difference = getMemoryDifference(previousMemoryUsage, usage);

  previousMemoryUsage = usage;

  return difference;
};

export const createDebugWithMemoryUsage = (name) => {
  const debug = createDebug(name);

  return (msg) => debug(`${msg} ${chalk.red(`[${memoryDiff()}]`)}`);
};

export const statExecution = (
  processName?: string,
  debugFunc = console.log
) => {
  // We use + to cast to number
  // https://github.com/microsoft/TypeScript/issues/5710
  const timeStart = +new Date();
  const endMemoryDiff = memoryDiff(true);

  return () => {
    const timeDifference = +new Date() - timeStart;
    const memoryDifference = endMemoryDiff();

    if (processName) {
      const timeDifferenceStr = `${chalk.bold(`TIME`)}: ${shortEnglishHumanizer(
        timeDifference
      )}`;

      const memoryDifferenceStr = `${chalk.bold(
        `MEMORY`
      )}: ${memoryDifference}`;

      debugFunc(
        chalk.red(
          `${chalk.bold(
            `STATS for "${processName}"`
          )}\n${timeDifferenceStr} ${memoryDifferenceStr}`
        )
      );
    }

    return { time: timeDifference, memory: memoryDifference };
  };
};
