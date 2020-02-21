import { readFile } from "fs";
import { promisify } from "util";

const readFileAsync = promisify(readFile);

import saveToken, { SAVE_TOKEN_FILE_PREFIX } from "../";

describe("@node-api-toolkit/save-token", () => {
  it("should take a token identifier and token and save to TMP file", async () => {
    await saveToken({
      tokenIdentifier: "TEST_TOKEN",
      token: "I_AM_A_TOKEN"
    });

    const token = (
      await readFileAsync(`${SAVE_TOKEN_FILE_PREFIX}TEST_TOKEN`)
    ).toString();

    expect(token).toEqual("I_AM_A_TOKEN");
  });
});
