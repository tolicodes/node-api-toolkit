import { promisify } from "util";
const dropboxV2Api = require("dropbox-v2-api");
import Queue from "@node-api-toolkit/queue";

import {
  FileCategory,
  ListFolderArgs,
  ListFileOfTypeReturn,
  FileList,
} from "./DropboxV2APITypes";
import filterFilesByType from "./filterFilesByType";

export type ListFilesOfTypeOpts = {
  accessToken: string;
  type: FileCategory;
  cursor?: string;
  tmpFile?: string;
};

type ListFolderOpts = {
  // @todo
  dropbox: any;
  queue?: Queue;
  numberOfResults?: number;
  cursor?: string;
  isFirst?: boolean;
  tmpFile?: string;
};

const listFolder = ({
  dropbox,
  queue,
  numberOfResults = 0,
  cursor,
  isFirst = true,
  tmpFile,
}: ListFolderOpts) => {
  if (!queue) {
    queue = new Queue({
      waitBetweenRequests: 0,
      maxConcurrent: 10,
      tmpFile,
      autoStart: false,
    });
  }

  queue.add(
    async () => {
      try {
        const listFolderArgs: ListFolderArgs = {
          path: "",
          recursive: true,
        };

        const listFolderContinueArgs = {
          cursor,
        };

        const resource = isFirst
          ? "files/list_folder"
          : "files/list_folder/continue";

        const { entries, cursor: newCursor, has_more } = (await dropbox({
          resource,
          parameters: isFirst ? listFolderArgs : listFolderContinueArgs,
        })) as ListFileOfTypeReturn;

        console.log(newCursor, queue.getTmpFile());

        numberOfResults += entries.length;

        if (has_more) {
          listFolder({
            dropbox,
            numberOfResults,
            cursor: newCursor,
            queue,
            isFirst: false,
            tmpFile,
          });
        }

        return entries;
      } catch (e) {
        throw {
          error: e,
          message: `Failed fetching cursor ${cursor}. Wrote records to "${tmpFile}"`,
          cursor,
        };
      }
    },
    {
      name: `files/list_folder - starting from #${numberOfResults}`,
    }
  );

  return queue;
};

/**
 * @param accessToken - access token
 * @param type - type of file
 * @param cursor - if there is an error, or we pause, we restart from a cursor
 * @param tmpFile - we can continue writing to a temp file
 */
export default async ({
  accessToken,
  type,

  cursor,
  tmpFile,
}: ListFilesOfTypeOpts): Promise<FileList> => {
  const dropbox = promisify(
    dropboxV2Api.authenticate({
      token: accessToken,
    })
  );

  // if we are continuing from a cursor and tmp file we pass
  // those, otherwise we start fresh
  const opts = tmpFile
    ? {
        dropbox,
        cursor,
        tmpFile,
        isFirst: false,
      }
    : {
        dropbox,
      };

  const files = [].concat(...(await listFolder(opts).isDone()));

  return filterFilesByType({
    files,
    type,
  });
};
