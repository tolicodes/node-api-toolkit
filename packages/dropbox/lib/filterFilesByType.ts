const { extname } = require("path");

import { FileList, FileCategory } from "./DropboxV2APITypes";
import fileTypes from "./static/fileExtensionsByType.json";

export type FilterFilesByTypesOpts = {
  files: FileList;
  type: FileCategory;
};

export default ({ files, type }: FilterFilesByTypesOpts): FileList => {
  const { extensions } = fileTypes.find(
    fileTypeList => fileTypeList.type === type
  );

  return files.filter(file => {
    const extension = extname(file.name).replace(".", "");
    return extensions.includes(extension);
  });
};
