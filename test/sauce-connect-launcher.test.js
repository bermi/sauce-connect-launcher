
var sauceConnectLauncher = require("../"),
  expect = require("expect.js"),
  fs = require("fs"),
  path = require("path"),
  sauceCreds;

require("colors");

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
      verbose: true,
      logger: function (message) {
        console.log("[info] ", message);
        log.push(message);
      }
    }, function (err, sauceConnectProcess) {
      console.log(err.message);
      sauceConnectProcess.close();

      // Expected command sequence
      expect(log).to.be.eql([
        "Missing Sauce Connect local proxy, downloading dependency",
        "This will only happen once.",
        "Downloading ",
        "\n",
        "Unzipping Sauce-Connect-latest.zip",
        "Saving Sauce-Connect.jar",
        "Removing Sauce-Connect-latest.zip",
        "Sauce Connect installed correctly",
        "Opening local tunnel using Sauce Connect",
        "Invalid Sauce Connect Credentials"
      ]);

      expect(err).to.be.an(Error);

      done();
    });
  });

  it("should work with real credentials", function (done) {
    try {
      sauceCreds = require("../user.json");
    } catch (e) {
      console.log("Please run make setup-sauce to set up real Sauce Labs Credentials".red);
      return done();
    }
    sauceCreds.verbose = true;
    sauceConnectLauncher(sauceCreds, function (err, sauceConnectProcess) {
      if (err) {throw err; }
      expect(sauceConnectProcess).to.be.ok();
      sauceConnectLauncher.kill();
      done();
    });
  });

});
