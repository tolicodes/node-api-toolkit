import dropbox from "../index";

describe("@node-api-toolkit/dropbox", () => {
  it("should get the oauth token using a jest tokenIdentifier", async () => {
    const { token } = await dropbox({
      auth: {
        useJestToken: true
      }
    });

    expect(token).toBeTruthy();
  });
});
