import { writeFile } from "fs";
import { promisify } from "util";

const writeFileAsync = promisify(writeFile);

export const SAVE_TOKEN_FILE_PREFIX = "/tmp/nodeApiToolkit-save-token-";

export type SaveTokenOpts = {
  token: string;
  tokenIdentifier?: string;
  filePath?: string;
};

/**
 * Saves a token to a file (pass either tokenIdentifier which will save to a unique file in /tmp/) or pass your own
 * filePath
 * @param param0.tokenIdentifier - Unique identifier for accessing this token (ex: DROPBOX_API_KEY_USER_123)
 * @param param0.token - The token that you're trying to save
 * @param param0.filePath - The file path to store the token in
 */
export default ({ tokenIdentifier, token, filePath }: SaveTokenOpts) => {
  let path;
  if (tokenIdentifier) {
    path = `${SAVE_TOKEN_FILE_PREFIX}${tokenIdentifier}`;
  } else if (filePath) {
    path = filePath;
  } else {
    throw new Error("tokenIdentifier or filePath required");
  }

  writeFileAsync(path, token);
};
