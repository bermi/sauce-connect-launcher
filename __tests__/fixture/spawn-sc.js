"use strict";

var sauceConnectLauncher = require("../../index");
console.log(process.argv[2]);
var options = JSON.parse(process.argv[2]);

options.logger = console.log;

sauceConnectLauncher(options, function (err)  {
  if (err) {
    throw err;
  }

  process.exit(0);
});
