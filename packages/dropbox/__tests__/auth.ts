import axios from "axios";
// mocks http requests that are used by oauth libraries
import nock = require("nock");
import express = require("express");

import auth from "../auth";

describe("@node-api-toolkit/dropbox/auth", () => {
  // we want to close the server after each run whether it's an
  // error or success
  let server;
  afterEach(done => {
    server.close(done);
  });

  it("should do an oauth flow", async done => {
    const app = express();
    server = app.listen(8888);

    // if it succeeds we will be redirected here
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
    const onOauthSuccess = jest.fn().mockResolvedValue({
      userId: "123",
      email: "franz@dropbox.com",
      name: {
        givenName: "Franz",
        surname: "Ferdinand",
        displayName: "Franz Ferdinand (Personal)"
      },
      // this isn't verified
      profile: {
        someField: "123"
      },
      // attaching metadata
      metadata: {
        someKey: true
      }
    });

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

    // we have start this after the command is run which starts the server
    setTimeout(async () => {
      // we hit the oauthStartUrl (default /auth/dropbox)
      const oauthRedirectPromise = axios.get(
        "http://localhost:8888/auth/dropbox"
      );

      // the endpoint redirects us to dropbox's oauth server (below).
      // usually it would have a login page where the user clicks "Login"
      // but here we just mock some text so that we can verify that the
      // redirect was successful
      nock(
        "https://www.dropbox.com/oauth2/authorize?response_type=code&redirect_uri=http%3A%2F%2F%2Flocalhost%3A8888%2Fauth%2Fdropbox%2Fcallback&client_id=KEY"
      )
        .get(/.*/)
        .reply(200, {
          status: "I am the oauth server"
        });

      // check that we were redirected to the oauth server
      expect((await oauthRedirectPromise).data).toEqual({
        status: "I am the oauth server"
      });

      // once the user logs in the oauth server will redirect back to
      // /auth/dropbox/callback (callbackUrl). We simulate that happening
      const responseServerPromise = axios.get(
        "http://localhost:8888/auth/dropbox/callback?code=123"
      );

      // Once the user reaches the callback url, the server will use the
      // authorization code (code) to get an oauth token. We mock the
      // response from dropbox's api with the access token and refresh
      // token
      nock("https://api.dropbox.com/oauth2/token/")
        .post(/.*/)
        .reply(200, {
          access_token: "I_AM_THE_TOKEN",
          refresh_token: "REFRESH_TOKEN"
        });

      // the callback endpoint then uses the token to reach out and get
      // the account details which have the account_id and some other
      // metadata
      nock("https://api.dropboxapi.com/2/users/get_current_account")
        .post(/.*/)
        // from https://www.dropbox.com/developers/documentation/http/documentation#users-get_current_account
        .reply(200, {
          account_id: "123",
          name: {
            given_name: "Franz",
            surname: "Ferdinand",
            familiar_name: "Franz",
            display_name: "Franz Ferdinand (Personal)",
            abbreviated_name: "FF"
          },
          email: "franz@dropbox.com",
          email_verified: true,
          disabled: false,
          locale: "en",
          referral_link: "https://db.tt/ZITNuhtI",
          is_paired: true,
          account_type: {
            ".tag": "business"
          },
          root_info: {
            ".tag": "user",
            root_namespace_id: "3235641",
            home_namespace_id: "3235641"
          },
          country: "US",
          team: {
            id: "dbtid:AAFdgehTzw7WlXhZJsbGCLePe8RvQGYDr-I",
            name: "Acme, Inc.",
            sharing_policies: {
              shared_folder_member_policy: {
                ".tag": "team"
              },
              shared_folder_join_policy: {
                ".tag": "from_anyone"
              },
              shared_link_create_policy: {
                ".tag": "team_only"
              }
            },
            office_addin_policy: {
              ".tag": "disabled"
            }
          },
          team_member_id: "dbmid:AAHhy7WsR0x-u4ZCqiDl5Fz5zvuL3kmspwU"
        });

      // once the server fetches the user info, it will redirect the user back
      // to the /success endpoint we created on top. We are verifying the
      // redirect was successful
      expect((await responseServerPromise).data).toEqual({
        success: true
      });

      // we want to make sure that the function we pass in as a
      // callback for a successful oauth contains the access token
      // refresh token, and formatter user
      expect(onOauthSuccess).toBeCalledWith({
        accessToken: "I_AM_THE_TOKEN",
        refreshToken: "REFRESH_TOKEN",
        user: {
          userId: "123",
          email: "franz@dropbox.com",
          name: {
            givenName: "Franz",
            familyName: "Ferdinand",
            displayName: "Franz Ferdinand (Personal)"
          },
          profile: expect.anything()
        }
      });

      done();
    }, 500);
  });
});
