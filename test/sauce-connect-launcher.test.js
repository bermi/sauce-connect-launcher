var
  _ = require("lodash"),
  sauceConnectLauncher = require("../"),
  expect = require("expect.js"),
  path = require("path"),
  rimraf = require("rimraf"),
  sauceCreds,
  verbose = process.env.VERBOSE_TESTS || false,
  https = require("https");

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
} catch (e) {
  require("colors");
  console.log("Please run make setup-sauce to set up real Sauce Labs Credentials".red);
}

function getTunnel(tunnelId, cb) {
  https.request({
    method: "GET",
    host: "saucelabs.com",
    port: 443,
    auth: process.env.SAUCE_USERNAME + ":" + process.env.SAUCE_ACCESS_KEY,
    path: "/rest/v1/" + process.env.SAUCE_USERNAME + "/tunnels/" + tunnelId
  }).on("response", function (res) {
    var body = "";
    res.on("data", function (chunk) {
      body += chunk;
    });
    res.on("end", function () {
      cb(null, res, JSON.parse(body));
    });
  }).on("error", cb).end();
}

describe("Sauce Connect Launcher", function () {
  var removeSauceConnect = function (done) {
    rimraf(path.normalize(__dirname + "/../sc/"), done);
  };

  before(removeSauceConnect);
  //after(removeSauceConnect);

  this.timeout(3600 * 10000);

  it("should download Sauce Connect", function (done) {
    // We need to allow enough time for downloading Sauce Connect
    var log = [];
    sauceConnectLauncher.download({
      logger: function (message) {
        if (verbose) {
          console.log("[info] ", message);
        }
        log.push(message);
      },
    }, function (err) {
      expect(err).to.not.be.ok();

      // Expected command sequence
      var expectedSequence = [
        "Missing Sauce Connect local proxy, downloading dependency",
        "This will only happen once.",
        "Downloading ",
        "Unzipping " + sauceConnectLauncher.getArchiveName(),
        "Removing " + sauceConnectLauncher.getArchiveName(),
        "Sauce Connect downloaded correctly",
      ];

      _.each(log, function (message, i) {
        expect(message).to.match(new RegExp("^" + (expectedSequence[i] || "\\*missing\\*")));
      });

      done();
    });
  });

  it("fails with an invalid executable", function (done) {
    var options = _.clone(sauceCreds);
    options.exe = "not-found";

    sauceConnectLauncher(options, function (err) {
      expect(err).to.be.ok();
      expect(err.message).to.contain("ENOENT");
      done();
    });
  });

  if (sauceCreds) {
    it("should work with real credentials", function (done) {
      sauceConnectLauncher(sauceCreds, function (err, sauceConnectProcess) {
        if (err) { throw err; }
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
        if (err) { throw err; }
        expect(sauceConnectProcess).to.be.ok();
        sauceConnectProcess.close(function () {
          done();
        });
      });
    });

    it("closes the open tunnel", function (done) {
      sauceConnectLauncher(sauceCreds, function (err, sauceConnectProcess) {
        if (err) { throw err; }
        expect(sauceConnectProcess).to.be.ok();
        expect(sauceConnectProcess.tunnelId).to.be.ok();

        getTunnel(sauceConnectProcess.tunnelId, function (err, res, body) {
          expect(err).to.not.be.ok();
          expect(res.statusCode).to.be(200);
          expect(body.status).to.eql("running");

          sauceConnectProcess.close(function () {
            setTimeout(function () { // Wait for tunnel to be terminated
              getTunnel(sauceConnectProcess.tunnelId, function (err, res, body) {
                expect(err).to.not.be.ok();
                expect(res.statusCode).to.be(200);
                expect(body.status).to.eql("terminated");
                done();
              });
            }, 3000);
          });
        });
      });
    });
  }
});
