# Save Token

A small utility to write your tokens to the file system to easily retrieve later

## Usage

There are two modes of usage:

### Save to default file location using a tokenIdentifier

You can easily save a token to the default storage location (in `/tmp`) and access it using
a unique identifier.

Examples of identifiers should look something like `MY_APP_DROPBOX_API_TOKEN_USER_123`. Remember to
make it as specific as possible because it may conflict with other tokens that are using
this tool. As a rule of thumb include:

- Name of your app
- Name of the token
- User ID/Email who the token belongs to

To save:

```typescript
import { saveToken } from "save-token";

await saveToken({
  tokenIdentifier: "TEST_TOKEN",
  token: "I_AM_A_TOKEN"
});
```

To retrieve do:

```typescript
import { getToken } from "save-token";

const token = await getToken({
  tokenIdentifier: "TEST_TOKEN"
});
```

### Save token to custom file

You can also specify a custom location for your file. This is useful if you have a existing
storage directory.

To save:

```typescript
import { saveToken } from "save-token";

await saveToken({
  fileName: "/my/custom/location/TEST_TOKEN",
  token: "I_AM_A_TOKEN"
});
```

To retrieve do:

```typescript
import { getToken } from "save-token";

const token = await getToken({
  fileName: "/my/custom/location/TEST_TOKEN"
});
```
