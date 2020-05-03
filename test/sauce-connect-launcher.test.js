"use strict";

var
  _ = require("lodash"),
  sauceConnectLauncher = require("../lib/sauce-connect-launcher"),
  expect = require("expect.js"),
  path = require("path"),
  rimraf = require("rimraf"),
  sauceCreds,
  verbose = process.env.VERBOSE_TESTS || false,
  childProcess = require("child_process"),
  fs = require("fs"),
  utils = require("../lib/utils.js");

try {
  // When environment variables for SAUCE are found, we don't need
  // to generate a user.json file
  sauceCreds = process.env.SAUCE_ACCESS_KEY ? {} : require("../user.json");
  sauceCreds.verbose = verbose;
  sauceCreds.log = [];
  sauceCreds.logfile = __dirname + "/../sauce_connect.log";
  sauceCreds.logger = function (message) {
    if (verbose) {
      console.log("[info] ", message);
    }
    sauceCreds.log.push(message);
  };
  sauceCreds.connectRetries = 3;
  sauceCreds.downloadRetries = 2;
} catch (e) {
  require("colors");
  console.log("Please run make setup-sauce to set up real Sauce Labs Credentials".red);
}

describe("Sauce Connect Launcher", function () {
  var removeSauceConnect = function (done) {
    rimraf(path.normalize(__dirname + "/../sc/"), done);
  };

  beforeEach(removeSauceConnect);

  afterEach(function (done) {
    sauceConnectLauncher.kill(done);
  });

  this.timeout(3600 * 10000);

  it("fails with an invalid executable", function (done) {
    var options = _.clone(sauceCreds);
    options.exe = "not-found";
    options.connectRetries = 0;

    sauceConnectLauncher(options, function (err) {
      expect(err).to.be.ok();
      expect(err.message).to.contain("ENOENT");
      done();
    });
  });

  it("does not trigger a download when providing a custom executable", function (done) {
    var options = _.clone(sauceCreds);
    options.exe = "not-found";
    options.connectRetries = 0;

    sauceConnectLauncher(options, function () {
      expect(fs.existsSync(path.join(__dirname, "../sc/versions.json"))).not.to.be.ok();
      done();
    });
  });

  it("should download Sauce Connect", function (done) {
    // We need to allow enough time for downloading Sauce Connect
    var log = [];
    var options = _.clone(sauceCreds);
    options.logger = function (message) {
      if (verbose) {
        console.log("[info] ", message);
      }
      log.push(message);
    };

    sauceConnectLauncher.download(options, function (err) {
      expect(err).to.not.be.ok();

      // Expected command sequence
      var expectedSequence = [
        "Missing Sauce Connect local proxy, downloading dependency",
        "This will only happen once.",
        "Downloading ",
        "Archive checksum verified.",
        "Unzipping ",
        "Removing ",
        "Sauce Connect downloaded correctly",
      ];

      _.each(log, function (message, i) {
        expect(message).to.match(new RegExp("^" + (expectedSequence[i] || "\\*missing\\*")));
      });

      done();
    });
  });

  it("handles errors when Sauce Connect download fails", function (done) {
    var log = [];
    var options = _.clone(sauceCreds);
    options.logger = function (message) {
      if (verbose) {
        console.log("[info] ", message);
      }
      log.push(message);
    };
    options.connectVersion = "9.9.9";
    options.downloadRetries = 1;

    sauceConnectLauncher.download(options, function (err) {
      expect(err).to.be.ok();
      expect(err.message).to.contain("Download failed with status code");

      // Expected command sequence
      var expectedSequence = [
        "Missing Sauce Connect local proxy, downloading dependency",
        "This will only happen once.",
        "Invalid response status: 404",
        "Missing Sauce Connect local proxy, downloading dependency",
        "This will only happen once."
      ];

      _.each(log, function (message, i) {
        expect(message).to.match(new RegExp("^" + (expectedSequence[i] || "\\*missing\\*")));
      });

      done();
    });
  });

  describe("handles misconfigured proxies and other request failures", function () {
    let options, http_proxy_original;

    beforeEach(function () {
      options = _.clone(sauceCreds);
      options.downloadRetries = 0;

      http_proxy_original = process.env.http_proxy;
      process.env.http_proxy = "http://127.0.0.1:12345/";
    })

    afterEach(function () {
      process.env.http_proxy = http_proxy_original;
    })

    it("when fetching versions.json", function (done) {
      sauceConnectLauncher.download(options, function (err) {
        expect(err).to.be.ok();
        expect(err.message).to.contain("ECONNREFUSED");

        done();
      });
    });

    it("with fixed version when fetching archive", function (done) {
      options.connectVersion = "9.9.9";

      sauceConnectLauncher.download(options, function (err) {
        expect(err).to.be.ok();
        expect(err.message).to.contain("ECONNREFUSED");

        done();
      });
    });
  });

  if (sauceCreds) {
    it("should work with real credentials", function (done) {
      sauceConnectLauncher(sauceCreds, function (err, sauceConnectProcess) {
        expect(err).to.not.be.ok();
        expect(sauceConnectProcess).to.be.ok();
        sauceConnectLauncher.kill();
        expect(sauceCreds.log).to.contain("Testing tunnel ready", "Closing Sauce Connect Tunnel");
        sauceConnectProcess.on("exit", function () {
          done();
        });
      });
    });

    it("should execute a provided close callback", function (done) {
      sauceConnectLauncher(sauceCreds, function (err, sauceConnectProcess) {
        expect(err).to.not.be.ok();
        expect(sauceConnectProcess).to.be.ok();
        sauceConnectProcess.close(function () {
          done();
        });
      });
    });

    it("extracts the tunnelId from sc output", function (done) {
      sauceConnectLauncher(sauceCreds, function (err, sauceConnectProcess) {
        expect(err).to.not.be.ok();
        expect(sauceConnectProcess).to.be.ok();
        expect(sauceConnectProcess.tunnelId).to.be.ok();

        utils.getTunnels(function (err, res, body) {
          expect(err).to.not.be.ok();
          expect(res.statusCode).to.be(200);
          expect(body).to.contain(sauceConnectProcess.tunnelId);

          sauceConnectProcess.close(done);
        });
      });
    });

    it("closes the open tunnel", function (done) {
      sauceConnectLauncher(sauceCreds, function (err, sauceConnectProcess) {
        expect(err).to.not.be.ok();
        expect(sauceConnectProcess).to.be.ok();
        expect(sauceConnectProcess.tunnelId).to.be.ok();

        utils.getTunnel(sauceConnectProcess.tunnelId, function (err, res, body) {
          expect(err).to.not.be.ok();
          expect(res.statusCode).to.be(200);
          expect(body.status).to.eql("running");

          sauceConnectProcess.close(function () {
            setTimeout(function () { // Wait for tunnel to be terminated
              utils.getTunnel(sauceConnectProcess.tunnelId, function (err, res, body) {
                expect(err).to.not.be.ok();
                expect(res.statusCode).to.be(200);
                expect(body.status).to.eql("terminated");
                done();
              });
            }, 5000);
          });
        });
      });
    });

    it("allows to spawn sc detached", function (done) {
      if (process.platform === "win32") { // detached mode not supported on windows yet
        return this.skip();
      }

      var pidfile = path.join(__dirname, "../sc_client.pid");
      var options = _.clone(sauceCreds);
      options.detached = true;
      options.pidfile = pidfile;
      delete options.logger;

      var args = [ path.join(__dirname, "./fixture/spawn-sc.js"), JSON.stringify(options) ];
      var sc = childProcess.spawn("node", args, { stdio: "inherit" });
      sc.on("error", function (err) {
        expect(err).to.not.be.ok();
      });

      sc.on("exit", function (code) {
        expect(code).to.be(0);

        fs.readFile(pidfile, function (err, content) {
          expect(err).to.not.be.ok();

          var pid = parseInt(content, 10);

          // Check, whether sc is still running
          expect(function () {
            process.kill(pid, 0);
          }).to.not.throwException();

          // Gracefully terminate it
          process.kill(pid, "SIGTERM");

          // Poll until the process is gone and verify that it has cleaned up
          var probeInterval = setInterval(function () {
            try {
              process.kill(pid, 0);
            } catch (err) {
              clearTimeout(probeInterval);

              expect(err).to.be.ok();
              expect(err.code).to.eql("ESRCH");
              done();
              /*
              Commenting as removal of .pid by saucelabs is not guaranteed.
              https://wiki.saucelabs.com/display/DOCS/Sauce+Connect+Command+Line+Reference
              fs.readFile(pidfile, function (err) {
                expect(err).to.be.ok();
                expect(err.code).to.eql("ENOENT");
                done();
              });*/
            }
          }, 1000);
        });
      });
    });
  }
});
