import { readFile } from "fs";
import { promisify } from "util";
import { v4 as uuid } from "uuid";

const readFileAsync = promisify(readFile);

import saveToken, { SAVE_TOKEN_FILE_PREFIX } from "../saveToken";

describe("@node-api-toolkit/save-token/saveToken", () => {
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

  it("should take a token and save to a custom file", async () => {
    const filePath = `/tmp/nodeApiToolkit-save-token-test-custom-file-${uuid()}`;
    await saveToken({
      token: "I_AM_A_TOKEN",
      filePath
    });

    const token = (await readFileAsync(filePath)).toString();

    expect(token).toEqual("I_AM_A_TOKEN");
  });
});
