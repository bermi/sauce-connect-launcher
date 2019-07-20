"use strict";

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const rimraf = require("rimraf");
const childProcess = require("child_process");


const sauceConnectLauncher = require("../lib/sauce-connect-launcher")
const utils = require("../lib/utils");

let sauceCreds = {};
const verbose = process.env.VERBOSE_TESTS || false;
try{
  sauceCreds = process.env.SAUCE_ACCESS_KEY ? {} : require("../user.json");
  sauceCreds.verbose = verbose;
  sauceCreds.log = [];
  sauceCreds.logfile = path.join(__dirname , "../sauce_connect.log");
  sauceCreds.logger = function (message) {
    if (verbose) {
      console.log("[info] ", message);
    }
    sauceCreds.log.push(message);
  };
  sauceCreds.connectRetries = 3;
  sauceCreds.downloadRetries = 2;

  process.env.SAUCE_API_HOST = "eu-central-1.saucelabs.com";
  process.env.SAUCE_ACCESS_KEY = sauceCreds.accessKey;
  process.env.SAUCE_USERNAME = sauceCreds.username;
}catch(err){
  require("colors");
  console.log("Please run make setup-sauce to set up real Sauce Labs Credentials".red);
}

describe("Sauce Connect Launcher", () => {
  
  beforeEach( (done) =>{
    jest.setTimeout(3600 * 10000);
    rimraf(path.normalize(__dirname + "/../sc/"), done);
  });
  afterEach( (done) => {
    sauceConnectLauncher.kill(done);
  });

  it("fails with an invalid executable", (done) => {
    var options = _.clone(sauceCreds);
    options.exe = "not-found";
    options.connectRetries = 0;
    
    sauceConnectLauncher(options, (err) => {
      expect(err).toBeTruthy();
      expect(err.message).toEqual(expect.stringContaining("ENOENT"));
      done();
    });
  });

  it("does not trigger a download when providing a custom executable", (done) => {
    var options = _.clone(sauceCreds);
    options.exe = "not-found";
    options.connectRetries = 0;

    sauceConnectLauncher(options, () => {
      expect(fs.existsSync(path.join(__dirname, "../sc/versions.json"))).toBeFalsy();
      done();
    });
  });

  it("should download Sauce Connect", (done) => {
    // We need to allow enough time for downloading Sauce Connect
    var log = [];
    var options = _.clone(sauceCreds);
    options.logger = (message) => {
      if (verbose) {
        console.log("[info] ", message);
      }
      log.push(message);
    };

    sauceConnectLauncher.download(options, (err) => {
      expect(err).toBeFalsy();

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

      _.each(log, (message, i) => {
        expect(message).toMatch(new RegExp("^" + (expectedSequence[i] || "\\*missing\\*")));
      });
      done();
    });
  });

  it("handles errors when Sauce Connect download fails", (done) => {
    var log = [];
    var options = _.clone(sauceCreds);
    options.logger = (message) =>  {
      if (verbose) {
        console.log("[info] ", message);
      }
      log.push(message);
    };
    options.connectVersion = "9.9.9";
    options.downloadRetries = 1;

    sauceConnectLauncher.download(options, (err) => {
      expect(err).toBeTruthy();
      expect(err.message).toEqual(expect.stringContaining("Download failed with status code"));

        // Expected command sequence
      var expectedSequence = [
        "Missing Sauce Connect local proxy, downloading dependency",
        "This will only happen once.",
        "Invalid response status: 404",
        "Missing Sauce Connect local proxy, downloading dependency",
        "This will only happen once."
      ];

      _.each(log,  (message, i) => {
        expect(message).toMatch(new RegExp("^" + (expectedSequence[i] || "\\*missing\\*")));
      });

      done();
    });
  });

  const connect = () => {
    return new Promise((resolve, reject) => {
      sauceConnectLauncher(sauceCreds, (err, sauceConnectProcess) => {
        if(err) {reject(err);}
        expect(err).toBeFalsy();
        expect(sauceConnectProcess).toBeTruthy();
        resolve(sauceConnectProcess);
      });
    });
  };
  
  it("should connect to saucelabs with valid credentials", async (done) => {
    const process = await connect();
    expect(sauceCreds.log).toEqual(expect.arrayContaining(["Testing tunnel ready"]));
    done();
  });

  it("should fetch active tunnels", async (done) => {
    const process = await connect();
    utils.getTunnels( (err, res, body) => {
      expect(err).toBeFalsy();
      expect(res.statusCode).toEqual(200);
      expect(body).toEqual(expect.arrayContaining([process.tunnelId]));
      done();
    });
  });

  it("should fetch tunnel by id", async(done) => {
    const process = await connect();
    utils.getTunnel(process.tunnelId,  (err, res, body) => {
      expect(err).toBeFalsy();
      expect(res.statusCode).toBe(200);
      expect(body.status).toBe("running");
      done();
    });
  });

  it("should close the active tunnel", async(done) => {
    const process = await connect();
    process.close( () => {
      utils.getTunnel(process.tunnelId,  (err, res, body) => {
        expect(err).toBeFalsy();
        expect(res.statusCode).toBe(200);
        expect(body.status).toBe("terminated");
        done();
      });
    });
  });

  describe("handles misconfigured proxies and other request failures", () => {
    let options, http_proxy_original;

    beforeEach(() => {
      options = _.clone(sauceCreds);
      options.downloadRetries = 0;

      http_proxy_original = process.env.http_proxy;
      process.env.http_proxy = "http://127.0.0.1:12345/";
    });
    afterEach(() => {
      process.env.http_proxy = http_proxy_original;
    });

    it("when fetching versions.json", (done) => {
      sauceConnectLauncher.download(options, (err) => {
        expect(err).toBeTruthy();
        expect(err.message).toEqual(expect.stringContaining("ECONNREFUSED"));
        done();
      });
    });

    it("with fixed version when fetching archive", (done) => {
      options.connectVersion = "9.9.9";
      sauceConnectLauncher.download(options, (err) => {
        expect(err).toBeTruthy();
        expect(err.message).toEqual(expect.stringContaining("ECONNREFUSED"));
        done();
      });
    });
  });
  
});



