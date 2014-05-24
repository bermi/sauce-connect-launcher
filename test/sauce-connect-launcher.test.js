var
  _ = require("lodash"),
  sauceConnectLauncher = require("../"),
  expect = require("expect.js"),
  path = require("path"),
  rimraf = require("rimraf"),
  sauceCreds,
  verbose = process.env.VERBOSE_TESTS || false;

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
} catch (e) {
  require("colors");
  console.log("Please run make setup-sauce to set up real Sauce Labs Credentials".red);
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
    sauceConnectLauncher({
      // We wont use real credentials, the point is to
      // know that we have the required jar to connect to
      // sauce
      username: "bermi",
      accessKey: "12345678-1234-1234-1234-1234567890ab",
      verbose: verbose,
      logger: function (message) {
        if (verbose) {
          console.log("[info] ", message);
        }
        log.push(message);
      },
      logfile: __dirname + "/../sauce_connect.log"
    }, function (err) {
      if (err) {
        console.log(err.message);
      }

      // Expected command sequence
      var expectedSequence = [
        "Missing Sauce Connect local proxy, downloading dependency",
        "This will only happen once.",
        "Downloading ",
        "Unzipping " + sauceConnectLauncher.getArchiveName(),
        "Removing " + sauceConnectLauncher.getArchiveName(),
        "Sauce Connect downloaded correctly",
        "Opening local tunnel using Sauce Connect",
        "Starting sc with args: ",
        "Creating tunnel with Sauce Labs",
        "Invalid Sauce Connect Credentials"
      ];

      _.each(log, function (message, i) {
        expect(message).to.match(new RegExp("^" + (expectedSequence[i] || "\\*missing\\*")));
      });

      expect(err).to.be.an(Error);

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
  }

});
