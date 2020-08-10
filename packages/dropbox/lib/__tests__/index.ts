import { saveToken } from "@node-cli-toolkit/save-token";

import isIntegrationTest from "../isIntegrationTest";
import dropbox from "../index";

describe("@node-api-toolkit/dropbox", () => {
  it("should get the oauth token using a jest tokenIdentifier", async () => {
    if (!isIntegrationTest()) {
      // we save a fake token file
      await saveToken({
        tokenIdentifier: "JEST_NODE_API_TOOLKIT_DROPBOX_PROTOTYPE_TOKEN",
        token: "123"
      });
    }

    const { token } = await dropbox({
      auth: {
        useJestToken: true
      }
    });

    expect(token).toBeTruthy();
  });
});
