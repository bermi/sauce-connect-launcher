"use strict";

var sauceConnectLauncher = require("../../index");
var options = JSON.parse(process.argv[2]);
options.logger = console.log;

process.env.SAUCE_API_HOST = "eu-central-1.saucelabs.com";
process.env.SAUCE_ACCESS_KEY = options.accessKey;
process.env.SAUCE_USERNAME = options.username;

sauceConnectLauncher(options, function (err)  {
  if (err) {
    console.log(err);
    throw err;
  }
  process.exit(0);
});
