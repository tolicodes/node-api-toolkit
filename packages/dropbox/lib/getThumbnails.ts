import { promisify } from "util";
const dropboxV2Api = require("dropbox-v2-api");

import Queue from "@node-api-toolkit/queue";

const MAX_THUMBNAIL_BATCH = 25;

const getBatch = async ({ dropbox, batch }) => {
  const getThumbnailArgs = {
    entries: batch.map((file) => ({
      path: file,
      size: "w480h320",
    })),
  };

  const { entries } = await dropbox({
    resource: "files/get_thumbnail_batch",
    parameters: getThumbnailArgs,
  });

  return entries;
};

const getThumbnails = ({ files, dropbox, queue = null }) => {
  if (!queue) {
    queue = new Queue({
      waitBetweenRequests: 0,
      maxConcurrent: 10,
    });
  }

  for (let i = 0; i < files.length; i += MAX_THUMBNAIL_BATCH) {
    const batch = files.slice(i, i + 25);
    queue.add(() => getBatch({ batch, dropbox }), {
      name: `thumbnail batch - starting #${i}`,
    });
  }

  return queue;
};

export default async ({ accessToken, files }) => {
  const dropbox = promisify(
    dropboxV2Api.authenticate({
      token: accessToken,
    })
  );

  const thumbs = [].concat(
    ...(await getThumbnails({ dropbox, files }).isDone())
  );

  return thumbs.map((thumb) => thumb.thumbnail);
};
