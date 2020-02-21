import { v4 as uuid } from "uuid";

import getToken from "../getToken";
import saveToken from "../saveToken";

describe("@node-api-toolkit/save-token/getToken", () => {
  it("should take a token identifier and get it from file", async () => {
    await saveToken({
      tokenIdentifier: "TEST_TOKEN",
      token: "I_AM_A_TOKEN"
    });

    const token = await getToken({
      tokenIdentifier: "TEST_TOKEN"
    });

    expect(token).toEqual("I_AM_A_TOKEN");
  });

  it("should take a filePath and read the token from it", async () => {
    const filePath = `/tmp/nodeApiToolkit-save-token-test-custom-file-${uuid()}`;
    await saveToken({
      token: "I_AM_A_TOKEN",
      filePath
    });

    const token = await getToken({
      filePath
    });

    expect(token).toEqual("I_AM_A_TOKEN");
  });
});
