import getTokenFromFile from "../getTokenFromFile";
import isIntegrationTest from "../isIntegrationTest";
import { saveToken } from "@node-cli-toolkit/save-token";

describe("@node-api-toolkit/dropbox/getTokenFromFile", () => {
  it("should get the token from token file", async () => {
    if (isIntegrationTest()) {
      try {
        const token = await getTokenFromFile();

        expect(token).toBeTruthy();
      } catch (e) {
        throw new Error(
          "You must run `yarn run create-jest-dropbox-token-file` to create the jest token file"
        );
      }
    } else {
      await saveToken({
        tokenIdentifier: "JEST_NODE_API_TOOLKIT_DROPBOX_PROTOTYPE_TOKEN_FAKE",
        token: "123"
      });

      const token = await getTokenFromFile({
        tokenIdentifier: "JEST_NODE_API_TOOLKIT_DROPBOX_PROTOTYPE_TOKEN_FAKE"
      });

      expect(token).toEqual("123");
    }
  });

  it.todo(
    "should accept an environmental variable called NODE_API_TOOLKIT_DROPBOX_PROTOTYPE_TOKEN"
  );
});
