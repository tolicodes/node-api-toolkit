import { createDebugWithMemoryUsage, statExecution } from "./memoryUtils";
import fs from "fs";
import uuid from "uuid/v4";
const chalk = require("chalk");

const TMP_DIR = "/tmp";

type WriteTmpFileOpts = {
  path: string;
  data: any;
};

const createDebugForFile = (file) => {
  const debug = createDebugWithMemoryUsage(`@node-api-toolkit/queue/tmpFile`);

  return (message) => debug(`${chalk.gray.bold(file)}\n${message}`);
};

export const createTmpFile = () => {
  const path = `${TMP_DIR}/node-api-toolkit-queue-tmp-file-${uuid()}.data`;
  const debug = createDebugForFile(path);

  debug(`Creating file`);

  fs.closeSync(fs.openSync(path, "w"));

  return path;
};

export const writeTmpFile = async ({ path, data }: WriteTmpFileOpts) => {
  const debug = createDebugForFile(path);

  const stringData = `${JSON.stringify(data)}\n`;
  await fs.promises.appendFile(path, stringData);

  debug(`Wrote data ${stringData}`);
};

export const readTmpFile = async ({ path }) => {
  const debug = createDebugForFile(path);
  const statReadFile = statExecution("Converting file", debug);

  debug(`Started reading`);

  const raw = await fs.promises.readFile(path, "utf8");
  debug(`Loaded file from disk`);

  const byNewLine = raw.split("\n");

  debug(`Split raw data by new line`);

  // get rid of last new line
  byNewLine.pop();

  const converted = byNewLine.map((line) => {
    return JSON.parse(line);
  });

  debug(`Parsing JSON`);

  debug(`Finished converting data`);

  statReadFile();

  return converted;
};
