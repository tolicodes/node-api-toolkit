import { getToken } from "@node-cli-toolkit/save-token";
const {
  TOKEN_IDENTIFIER: tokenIdentifierArg,
  NODE_API_TOOLKIT_DROPBOX_PROTOTYPE_TOKEN
} = process.env;

// this is the token we use for jest tests
// generate it using `create-jest-dropbox-token-file`
export const JEST_TOKEN_IDENTIFIER =
  "JEST_NODE_API_TOOLKIT_DROPBOX_PROTOTYPE_TOKEN";

export type GetTokenFromFileOpts = {
  tokenIdentifier?: string;
};

/**
 * Gets the token identifier that is passed in, in the args, or the jest token identifier
 *
 * @param tokenIdentifier - The token identifier
 */
export default async ({
  tokenIdentifier = tokenIdentifierArg || JEST_TOKEN_IDENTIFIER
}: GetTokenFromFileOpts = {}): Promise<string> => {
  // for use in CI
  if (NODE_API_TOOLKIT_DROPBOX_PROTOTYPE_TOKEN) {
    return NODE_API_TOOLKIT_DROPBOX_PROTOTYPE_TOKEN;
  }

  // get from file
  try {
    return await getToken({
      tokenIdentifier
    });
  } catch (e) {
    throw new Error(
      "Couldn't find dropbox API Token. You must run `yarn run create-jest-dropbox-token-file` to create the jest token file, use the NODE_API_TOOLKIT_DROPBOX_PROTOTYPE_TOKEN environmental variable, or programmatically pass the token you created using `yarn run create-dropbox-token-file`"
    );
  }
};
