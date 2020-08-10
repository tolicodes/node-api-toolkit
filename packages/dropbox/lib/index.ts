import getTokenFromFile from "./getTokenFromFile";

export type DropboxOpts = {
  auth: {
    useJestToken?: boolean;
  };
};

export type DropboxReturn = {
  token: string;
};

/**
 * @param auth.useJestToken - Should use a jest token for testing purposes
 */
export default async ({
  auth: { useJestToken }
}: DropboxOpts): Promise<DropboxReturn> => {
  let token;
  if (useJestToken) {
    token = await getTokenFromFile();
  }

  return {
    token
  };
};
