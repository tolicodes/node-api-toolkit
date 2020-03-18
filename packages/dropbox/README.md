# Dropbox

A set of Dropbox API utilities

## Installation

```bash
yarn add @node-api-toolkit/dropbox
```

## Utilities

- `@node-api-toolkit/dropbox/auth` - Authenticates the user using oauth.

## Usage

### To Prototype

Run

```bash
yarn run create-dropbox-token-file --tokenIdentifier YOUR-TOKEN-IDENTIFIER
```

Then you can manually use the token by using [`save-token/getToken`](../save-token). Read those
docs for more info

### @node-api-toolkit/dropbox/auth

```typescript
import express = require("express");

import auth from "@node-api-toolkit/dropbox/auth";

const app = express();
const server = app.listen(8888);

// if it succeeds we will be redirected here
// this should be the home page of your app
app.get("/success", (req, res) => {
  res.json({
    success: true
  });
});

// if it fails we will be redirected here
app.get("/failure", (req, res) => {
  res.json({
    success: false
  });
});

// this function gets called when an oauth is successful
// it needs to return back the user that it was given
// with possible metadata attached
// {
//   accessToken: "I_AM_THE_TOKEN",
//   refreshToken: "REFRESH_TOKEN",
//   user: {
//     userId: "123",
//     email: "franz@dropbox.com",
//     name: {
//       givenName: "Franz",
//       familyName: "Ferdinand",
//       displayName: "Franz Ferdinand (Personal)"
//     },
//     profile: expect.anything()
//   }
// }
const onOauthSuccess = ({ accessToken, refreshToken, profile }) => {
  return new Promise(resolve => {
    const modifiedUser = {
      ...profile,
      // attaching metadata
      metadata: {
        jwtToken: "123"
      }
    };

    // we do something to link the access token to the user
    // (User refers to a user model you use to create a user in your database)
    // example:
    User.findOrCreate({ providerId: profile.userId }, (err, user) => {
      if (err) {
        throw new Error(err);
      }
      return resolve(user);
    });
  });
};

// adds auth endpoints to the expressApp
auth({
  appKey: "KEY",
  appSecret: "SECRET",
  onOauthSuccess,

  expressApp: app,
  callbackURL: "http://localhost:8888/auth/dropbox/callback",

  successRedirect: "/success",
  failureRedirect: "/failure"
});

// User now visits the `oauthStartUrl` (default /auth/dropbox)
// http://localhost:8888/auth/dropbox

// The endpoint redirects us to dropbox's oauth server (below).
// usually it would have a login page where the user clicks "Login"
// but here we just mock some text so that we can verify that the
// redirect was successful

// once the user logs in the oauth server will redirect back to
// /auth/dropbox/callback (callbackUrl). We simulate that happening
// http://localhost:8888/auth/dropbox/callback?code=123

// Once the user reaches the callback url, the server will use the
// authorization code (code) to get an oauth token. We mock the
// response from dropbox's api with the access token and refresh
// token

// the callback endpoint then uses the token to reach out and get
// the account details which have the account_id and some other
// metadata

// once the server fetches the user info, it will redirect the user back
// to the /success endpoint we created on top. We are verifying the
// redirect was successful
```

## Tests

This package is thoroughly tested. All tests located in [`__tests__`](__tests__/)

You should run tests from the monorepo root. But you can also run them individually.

Both accept the following `yarn run` commands:

- `yarn run test`: Runs tests with mocks (mocks API)
- `test:watch`: Watches tests (use for development)
- `test:debug`: Prints debug information
- `yarn run test:watch:debug`: Prints debug info in watch mode
- `yarn run test:integration`: Uses the real APIs to test. Note you need to set up the token using `yarn run create-jest-dropbox-token-file`
- `yarn run test:integration:watch`: Uses the real APIs to test in watch mode. Note you need to set up the token using `yarn run create-jest-dropbox-token-file`

To run tests with the real API, you must first generate a JEST token.

```bash
yarn run create-jest-dropbox-token-file
```
