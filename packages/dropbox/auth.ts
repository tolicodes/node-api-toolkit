import { express } from "express";
import passport = require("passport");
import { Strategy as DropboxOAuth2Strategy } from "passport-dropbox-oauth2";
import url = require("url");

export type OnOauthSuccessOpts = {
  accessToken: string;
  refreshToken: string;
  profile: object;
  userId: string;
};

export type OnOauthSuccess = (OnOauthSuccessOpts) => Promise<void>;

export type AuthOpts = {
  appKey: string;
  appSecret: string;
  onOauthSuccess: OnOauthSuccess;

  expressApp: express.Application;
  authStartPath?: string;
  callbackURL: string;

  successRedirect: string;
  failureRedirect?: string;
};

/**
 * Sets up Dropbox Oauth authentication on your express application
 *
 * 1. First passport is set up using the `appKey` and `appSecret`.
 * 2. Then when the user visits `authStartPath`, they are redirected to
 * Dropbox's server.
 * 3. The user then logs in on Dropbox's server
 * 4. The Dropbox server responds with the authentication code to `callbackURL`
 * 5. Passport makes a request for the Token to the Dropbox API  using `appKey`
 * and `appSecret` and the `code` it just got back.
 * 6. If the token is fetched successful, we redirect to `successRedirect`, otherwise
 * we redirect to `failureRedirect`
 *
 * @param appKey This is the app key/clientID you get from creating your Dropbox application
 * (https://docs.gravityforms.com/creating-a-custom-dropbox-app/) (ex: 3u23809sd90239)
 * @param appSecret This is the app secret/client secret you get from creating your Dropbox application
 * (ex: 3u23809sd90239)
 * @param onOauthSuccess The callback for when the oauth is successful and we have the token. Usually you
 * would link the token to a user using the `userID`. This function has to return a promise that resolves
 * when you finish processing
 *
 * @param expressApp - The express app that you want to create routes on
 * @param authStartPath - (optional) The path the user should go to to start authentication (default: /auth/dropbox)
 * @param callbackURL - The full url that the Dropbox Oauth server will respond to including the domain
 * (ex: http://yourdomain.com/auth/dropbox/response). The app will extract the path and automatically create
 * a handler on it to read the response
 * @param successRedirect - Once the oauth flow completes successfully where should the user be redirected to
 * (ex: /appHome)
 * @param failureRedirect - If the oauth flow fails, where should the user be redirected to
 * (ex: /login)
 */
export default ({
  appKey,
  appSecret,
  onOauthSuccess,

  expressApp,
  authStartPath = "/auth/dropbox",
  callbackURL,

  successRedirect,
  failureRedirect
}: AuthOpts): void => {
  // set up passport authentication
  passport.use(
    new DropboxOAuth2Strategy(
      {
        apiVersion: "2",
        clientID: appKey,
        clientSecret: appSecret,
        callbackURL
      },
      async (accessToken, refreshToken, profile, done) => {
        // instead of using callback style we expect the success function to
        // resolve a promise on completion
        await onOauthSuccess({
          accessToken,
          refreshToken,
          profile,
          userId: profile.id
        });
        done();
      }
    )
  );

  expressApp.get(authStartPath, passport.authenticate("dropbox-oauth2"));

  // ex: http://localhost:8888/dropbox-callback becomes /dropbox-callback
  const callbackPath = url.parse(callbackURL).pathname;
  expressApp.get(
    callbackPath,
    passport.authenticate("dropbox-oauth2", { failureRedirect }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect(successRedirect);
    }
  );
};
