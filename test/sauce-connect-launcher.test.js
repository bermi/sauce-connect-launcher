
var sauceConnectLauncher = require("../"),
  expect = require("expect.js"),
  fs = require("fs"),
  path = require("path"),
  sauceCreds,
  verbose = process.env.VERBOSE_TESTS || false;

try {
  sauceCreds = require("../user.json");
  sauceCreds.verbose = verbose;
  sauceCreds.log = [];
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
    try {
      fs.unlinkSync(path.normalize(__dirname + "/../lib/Sauce-Connect.jar"));
    } catch (e) { }
    try {
      fs.unlinkSync(path.normalize(__dirname + "/../lib/Sauce-Connect-latest.zip"));
    } catch (e) { }
    done();
  };

  before(removeSauceConnect);
  after(removeSauceConnect);

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
      }
    }, function (err, sauceConnectProcess) {
      if (err) {
        console.log(err.message);
      }

      sauceConnectProcess.close();

      // Expected command sequence
      expect(log).to.be.eql([
        "Missing Sauce Connect local proxy, downloading dependency",
        "This will only happen once.",
        "Downloading ",
        "Unzipping Sauce-Connect-latest.zip",
        "Removing Sauce-Connect-latest.zip",
        "Sauce Connect installed correctly",
        "Opening local tunnel using Sauce Connect",
        "Invalid Sauce Connect Credentials"
      ]);

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
        done();
      });
    });
  }

});
