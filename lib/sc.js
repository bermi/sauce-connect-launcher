// We need to keep the number of external dependencies to a minimum in order
// to mitigate a npm bug: https://github.com/npm/npm/issues/6624
var fs     = require("fs");
var https  = require("https");
var path   = require("path");
var exists = fs.existsSync || path.existsSync;
// Packages that npm depends on are most likely ok (already installed):
var mkdirp = require("mkdirp");
var rimraf = require("rimraf");
// There are two lazy-loaded dependencies (adm-zip, tar) - one of which is
// actually used depending on the platform. We load them as late as possible
// (after downloading the archive) in hopes that node has already fetched and
// built them by the time we get there.

var VERSION = process.env.SAUCE_CONNECT_VERSION || require("../package.json").sauceConnectLauncher.scVersion;
var ARCHIVE_NAME = {
  darwin: "sc-" + VERSION + "-osx.zip",
  win32:  "sc-" + VERSION + "-win32.zip",
}[process.platform] || "sc-" + VERSION + "-linux.tar.gz";

var BASE_DIR = path.resolve(__dirname, "..", "sc");
// Where the archive is downloaded to
var ARCHIVE_PATH = path.join(BASE_DIR, ARCHIVE_NAME);
var ARCHIVE_URL  = "https://saucelabs.com/downloads/" + ARCHIVE_NAME;
// Where the archive is extracted to
var ARCHIVE_DIR  = path.join(BASE_DIR, ARCHIVE_NAME.match(/^(.+)(\.zip|\.tar\.gz)/)[1]);
var BIN_PATH     = path.join(ARCHIVE_DIR, "bin", "sc"); // POSIX only!

// Steps

function downloadArchive(logger, callback) {
  var request = https.request(ARCHIVE_URL);

  request.on("response", function(response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return callback("Status " + response.statusCode + " when downloading " + ARCHIVE_URL);
    }

    var size = (parseInt(response.headers["content-length"], 10) / (1024 * 1024) + "").substr(0, 4);
    logger("Downloading " + ARCHIVE_URL + " (" + size + "MB)");

    response.pipe(fs.createWriteStream(ARCHIVE_PATH));
    response.on("end", callback);
  });

  request.end();
}

function extractZip(logger, callback) {
  var AdmZip = require("adm-zip");

  var zip = new AdmZip(ARCHIVE_PATH);
  zip.extractAllTo(BASE_DIR, true);
  callback();
}

function extractTar(logger, callback) {
  var tar  = require("tar");
  var zlib = require("zlib");

  var extractor = tar.Extract({path: BASE_DIR, depth: 1})
    .on("end",   callback)
    .on("error", callback);

  fs.createReadStream(ARCHIVE_PATH)
    .on("error", callback)
    .pipe(zlib.createGunzip())
    .pipe(extractor);
}

function extractArchive(logger, callback) {
  logger("Unzipping " + ARCHIVE_PATH);
  if (ARCHIVE_PATH.slice(-4) === ".zip") {
    extractZip(logger, callback);
  } else if (ARCHIVE_PATH.slice(-7) === ".tar.gz") {
    extractTar(logger, callback);
  } else {
    callback("Unknown archive format");
  }
}

function setPermissions(logger, callback) {
  // No need on Windows.
  if (process.platform === "win32") {
    return callback();
  }
  fs.chmod(BIN_PATH, 0755, callback);
}

// Utility

// To avoid a dependency on async.
function series(steps, callback) {
  function doStep() {
    if (!steps.length) {
      return callback();
    }

    var step = steps.shift();
    step(function(error) {
      if (error) {
        return callback(error);
      }
      doStep();
    });
  }
  doStep();
}

// Flow

function download(options, callback) {
  if (arguments.length === 1) {
    callback = options;
    options = {};
  }
  var logger = options.logger || function () {};

  // Bail early if we already have it.
  if (exists(BIN_PATH)) {
    return callback();
  }

  series([
    // Remove any existing archive or extraction.
    rimraf.bind(null, ARCHIVE_PATH),
    rimraf.bind(null, ARCHIVE_DIR),
    // Actual work
    mkdirp.bind(null, BASE_DIR),
    downloadArchive.bind(null, logger),
    extractArchive.bind(null, logger),
    setPermissions.bind(null, logger),
    // Cleanup
    function(callback) {
      logger("Removing " + ARCHIVE_PATH);
      rimraf(ARCHIVE_PATH, callback);
    },
  ], function(error) {
    if (!error) {
      logger("Sauce Connect downloaded correctly");
    }
    callback(error);
  });
}

// When run as a script

if (require.main === module) {
  download({
    logger: console.log.bind(console),
  }, function(error) {
    if (error) {
      console.log('Failed to download sauce connect binary:', error);
      console.log('sauce-connect-launcher will attempt to re-download next time it is run.');
    }
  });
}

module.exports = {
  download:     download,
  VERSION:      VERSION,
  BASE_DIR:     BASE_DIR,
  ARCHIVE_NAME: ARCHIVE_NAME,
  ARCHIVE_DIR:  ARCHIVE_DIR,
  BIN_PATH:     BIN_PATH,
};
