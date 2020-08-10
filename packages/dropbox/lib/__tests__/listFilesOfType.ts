import listFilesOfType from "../listFilesOfType";
import getTokenFromFile from "../getTokenFromFile";
const { writeFileSync, readFileSync } = require("fs");

// should we generate the mock files? switch to true to regenerate
const WRITE_MOCKS = true;

const TMP_FILE =
  "/tmp/node-api-toolkit-queue-tmp-file-8225970f-6d75-4eab-bcf3-bf4bea3bcd0e.data";

describe("@node-api-toolkit/dropbox/listFilesOfType", () => {
  jest.setTimeout(10000000);

  it("should be able to list all files of specific type", async () => {
    const MOCK_FILE = `${__dirname}/../__mocks/imageFilesList.json`;
    const entries = await listFilesOfType({
      accessToken: await getTokenFromFile(),
      type: "image",
    });

    if (WRITE_MOCKS) {
      writeFileSync(MOCK_FILE, JSON.stringify(entries, null, 2));
    } else {
      expect(JSON.parse(readFileSync(MOCK_FILE, "utf8"))).toEqual(entries);
    }
  });

  it("should be able to resume using a tmpFile and cursor", async () => {
    const MOCK_FILE = `${__dirname}/../__mocks/imageFilesList.json`;
    const entries = await listFilesOfType({
      accessToken: await getTokenFromFile(),
      type: "image",
      cursor:
        "AAGVF_Oamex_jVYcQxDbCy-36n3IIjEiEmVCfVWo7QJmcNrFOMBRj5ILXZRsYbG-9lmmhP6pMqewlxkAZQ0E17qhQCfEof-xtLwOvlyeAlO_k7WTSheqXe5P1viuK-IxM7EeQmPxu1mYd8aems9lsCnl7M3dod2ea-o_kcYxm5CuvtJTcjfgjOzHwRvmqmW33QICFMjS2FtM5ZUkn7RxpEE18-DPC-RsLAWVR8KcBhoET-bz176irJ5T5XtF7SH8ZlFbGrHGezq0_28zLwiymkhijeHatzfRVsk4GOYHzM0nUGPsnRBgaePZX0jQm06AZ1QU-4ZVvVSEnBXSeFP6wXg1GLJnaAgiRCOG98SSJF9aidngWUBqjcqFuLfUxCZ_zCTbN_2JhCQsn9PhPXVPPob6by7r54kFXQYBW-rgrNY28vZVJ1Zh3wbWYzuak3S6RC6lJryQxCZ1FNI_jyEnPlv1snuLsW22e5rddpwROx1WYF7oVh_6554GpSA24BqQV1NIIk7KuBO2fvb0zHa5LYRDorVYXygsEd1M-5VdAUGOou11GFcyCPYIRNcQMqYSiSJxM5bFRqhdC6vKxF1S7PofeExpBuSfONv7xWes82vz3Z4q7YF5r1xWXjYbAe2ebADFy9vbzqCnafdxr76o0PMDiNY2VEfhVxJmK1Ot42SS6uapoKqmSFoZ742uGa_6CBUrye_1-Drog0UxbUHmD51gZp9oXQi_uCKjUMOdbA6GvXXoXHqglmmLi0nccLFLVz_NOCRLJDZytFB8vEnOPzDjqL1wdmKnl_V4feFTR5UFYFZ-pIs7jwkQuFeyGVDa29Wl6u9JGX70dQ6PK89TB1qYlRFkoWcCam6iVfQFxkzzsb8OyOj-M-97kcWMWaGIA-k",
      tmpFile: TMP_FILE,
    });

    if (WRITE_MOCKS) {
      writeFileSync(MOCK_FILE, JSON.stringify(entries, null, 2));
    } else {
      expect(JSON.parse(readFileSync(MOCK_FILE, "utf8"))).toEqual(entries);
    }
  });

  it.only("should load tmpFile if it exists", async () => {
    const entries = await listFilesOfType({
      accessToken: await getTokenFromFile(),
      type: "image",
      tmpFile: TMP_FILE,
    });
  });
});
