import { writeFile } from "fs";
import { promisify } from "util";

const writeFileAsync = promisify(writeFile);

export const SAVE_TOKEN_FILE_PREFIX = "/tmp/nodeApiToolkit-save-token-";

export type SaveTokenOpts = {
  tokenIdentifier: string;
  token: string;
};

/**
 * Saves a token to a file
 * @param param0.tokenIdentifier - Unique identifier for accessing this token (ex: DROPBOX_API_KEY_USER_123)
 * @param param0.token - The token that you're trying to save
 */
export default ({ tokenIdentifier, token }) =>
  writeFileAsync(`${SAVE_TOKEN_FILE_PREFIX}${tokenIdentifier}`, token);
