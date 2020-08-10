import filterFilesByType from "../filterFilesByType";
import fileTypesFileList from "../__mocks/fileTypesFileList.json";

describe("@node-api-toolkit/dropbox/filterFilesByType", () => {
  it("should be able to filter a file list by type", async () => {
    const files = await filterFilesByType({
      files: fileTypesFileList,
      type: "image"
    });

    expect(files[0].name).toEqual("B.jpg");
    expect(files[1].name).toEqual("A.jpg");
    expect(files.length).toBe(2);
  });
});
