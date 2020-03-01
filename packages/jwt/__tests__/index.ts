import express = require("express");

import jwt from "../";

describe("@node-api-toolkit/jwt", () => {
  it("should authenticate the user through jwt", async () => {
    const app = new express();
    const server = app.listen(8888);

    jwt({
      expressApp: app
    });
  });
});
