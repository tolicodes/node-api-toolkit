import { readFile } from "fs";
import { promisify } from "util";

const readFileAsync = promisify(readFile);

import { SAVE_TOKEN_FILE_PREFIX } from "./saveToken";

export type GetTokenOpts = {
  tokenIdentifier?: string;
  filePath?: string;
};

/**
 * Gets a token from a file (pass either tokenIdentifier which will get it from default location in /tmp/)
 * or pass your own filePath where the token is saved
 * @param param0.token - The token that you're trying to save
 * @param param0.filePath - The file path to store the token in
 */
export default async ({ tokenIdentifier, filePath }: GetTokenOpts) => {
  let path;
  if (tokenIdentifier) {
    path = `${SAVE_TOKEN_FILE_PREFIX}${tokenIdentifier}`;
  } else if (filePath) {
    path = filePath;
  } else {
    throw new Error("tokenIdentifier or filePath required");
  }

  return (await readFileAsync(path)).toString();
};
