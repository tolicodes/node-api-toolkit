// https://www.dropbox.com/developers/documentation/http/documentation#files-search
// look under options > Search Options > file_categories > FileCategory
export type FileCategory =
  | "image"
  | "document"
  | "pdf"
  | "spreadsheet"
  | "presentation"
  | "audio"
  | "video"
  | "folder"
  | "paper"
  | "others";

export type SearchOptions = {
  path?: string;
  max_results?: number;
  // @todo
  file_status?: any;
  filename_only?: boolean;
  file_extensions?: string[];
  file_categories?: FileCategory[];
};

// for /files/search
export type SearchV2Arg = {
  query: string;
  options?: SearchOptions;
};

// for /files/list_folder
// https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder
export type ListFolderArgs = {
  path: string;
  recursive?: boolean;
  include_deleted?: boolean;
  include_has_explicit_shared_members?: boolean;
  include_mounted_folders?: boolean;
  limit?: number;
  shared_link?: {
    url: string;
    password: string;
  };
  include_property_groups?: {
    filter_some: string[];
  };
  include_non_downloadable_files?: boolean;
};

export type ListFileOfTypeReturn = {
  entries: FileList;
  cursor: string;
  has_more: boolean;
};

export type FileList = File[];

export type File = {
  name?: string;
};
