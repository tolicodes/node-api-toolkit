import getTokenFromFile from "../getTokenFromFile";
import isIntegrationTest from "../isIntegrationTest";
import { saveToken } from "@node-cli-toolkit/save-token";

describe("@node-api-toolkit/dropbox/getTokenFromFile", () => {
  it("should get the token from token file", async () => {
    if (isIntegrationTest()) {
      const token = await getTokenFromFile();

      expect(token).toBeTruthy();
    } else {
      await saveToken({
        tokenIdentifier: "JEST_NODE_API_TOOLKIT_DROPBOX_PROTOTYPE_TOKEN_FAKE",
        token: "123"
      });

      const token = await getTokenFromFile({
        tokenIdentifier: "JEST_NODE_API_TOOLKIT_DROPBOX_PROTOTYPE_TOKEN_FAKE"
      });

      // could also be an environmental variable passed in
      expect(token).toBeTruthy();
    }
  });

  it.todo(
    "should accept an environmental variable called NODE_API_TOOLKIT_DROPBOX_PROTOTYPE_TOKEN"
  );
});
