import axios from "axios";
import xhrMock from "xhr-mock";
import express = require("express");

import auth from "../auth";

describe("@node-api-toolkit/dropbox/auth", () => {
  let server;
  afterEach(done => {
    server.close(done);
  });

  it("should do an oauth flow", async done => {
    const app = express();
    server = app.listen(8888);

    const onOauthSuccess = jest.fn();

    auth({
      appKey: "KEY",
      appSecret: "SECRET",
      onOauthSuccess,

      expressApp: app,
      callbackURL: "http:///localhost:8888/auth/dropbox/callback",

      successRedirect: "/success"
    });

    // we have start this after the command is run which starts the server
    setTimeout(async () => {
      try {
        const oauthRedirect = await axios.get(
          "http://localhost:8888/auth/dropbox"
        );
        expect(oauthRedirect.request.res.url).toBe("something");
      } catch (e) {
        console.log(e);
      }

      // simulate a redirect from the oauth server (user logged in)
      const responseServerPromise = axios.get(
        "http://localhost:8888/auth/dropbox/callback?code=123"
      );

      xhrMock.setup();

      xhrMock.get(/api\.dropbox\.com\/oauth2/, {
        status: 200,
        body: {
          access_token: "I_AM_THE_TOKEN",
          token_type: "Bearer",
          uid: "789"
        }
      });

      expect((await responseServerPromise).request.res.url).toEqual("/success");
    }, 500);
  });
});
