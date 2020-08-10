import getThumbnails from "../getThumbnails";
import getTokenFromFile from "../getTokenFromFile";
const { writeFileSync, readFileSync } = require("fs");

// should we generate the mock files? switch to true to regenerate
const WRITE_MOCKS = true;

describe("@node-api-toolkit/dropbox/getThumbnails", () => {
  it("should be able to get thumbnails for a batch of files", async () => {
    jest.setTimeout(100000);
    const imageListFile = `${__dirname}/../__mocks/imageFilesList.json`;
    const MOCK_FILE = `${__dirname}/../__mocks/imageThumbnails.json`;

    const imageList = JSON.parse(readFileSync(imageListFile, "utf8"));

    const entries = await getThumbnails({
      accessToken: await getTokenFromFile(),
      files: imageList.map((image) => image.path_display),
    });

    if (WRITE_MOCKS) {
      writeFileSync(MOCK_FILE, JSON.stringify(entries, null, 2));
    } else {
      expect(JSON.parse(readFileSync(MOCK_FILE, "utf8"))).toEqual(entries);
    }
  });
});
