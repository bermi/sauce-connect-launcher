var
  fs = require("fs"),
  path = require("path"),
  rimraf = require("rimraf"),
  os = require("os"),
  _ = require("lodash"),
  async = require("async"),
  spawn = require("child_process").spawn,
  sc = require("./sc"),
  // Node v0.8 uses os.tmpDir(), v0.10 uses os.tmpdir()
  readyfile = path.normalize((os.tmpdir ? os.tmpdir() : os.tmpDir()) + "/sc-launcher-readyfile"),
  currentTunnel,
  logger = console.log,
  cleanup_registered = false;

function killProcesses(callback) {
  callback = callback || function () {};

  if (!currentTunnel) {
    return callback();
  }

  currentTunnel.on("close", function () {
    currentTunnel = null;
    callback();
  });
  currentTunnel.kill("SIGTERM");
}

function clean(callback) {
  async.series([
    killProcesses,
    function (next) {
      rimraf(sc.BASE_DIR, next);
    }
  ], callback);
}

// Make sure all processes have been closed
// when the script goes down
function closeOnProcessTermination() {
  if (cleanup_registered) {
    return;
  }
  cleanup_registered = true;
  process.on("exit", function () {
    logger("Shutting down");
    killProcesses();
  });
}

function run(options, callback) {
  callback = _.once(callback);

  function ready() {
    logger("Testing tunnel ready");
    closeOnProcessTermination();
    callback(null, child);
  }

  logger("Opening local tunnel using Sauce Connect");
  var child,
    watcher,
    args = [
      "-u", options.username || process.env.SAUCE_USERNAME,
      "-k", options.accessKey || process.env.SAUCE_ACCESS_KEY
    ],
    error,
    dataActions = {
      "Please wait for 'you may start your tests' to start your tests": function connecting() {
        logger("Creating tunnel with Sauce Labs");
      },
      //"you may start your tests": ready,
      "This version of Sauce Connect is outdated": function outdated() {

      },
      "Error: ": function handleError(data) {
        if (data.indexOf("Not authorized") !== -1 && !error) {
          logger("Invalid Sauce Connect Credentials");
          error = new Error("Invalid Sauce Connect Credentials. " + data);
        } else if (data.indexOf("HTTP response code indicated failure") === -1) {
          // sc says the above before it says "Not authorized", but the following
          // Error: message is more useful
          error = new Error(data);
        }
      },
      "Goodbye.": function shutDown() {

      }
    };

  if (options.port) {
    args.push("-P", options.port);
  }

  if (options.proxy) {
    args.push("--proxy", options.proxy);
  }

  if (options.directDomains) {
    if (_.isArray(options.directDomains)) {
      options.directDomains = options.directDomains.join(",");
    }
    args.push("--direct-domains", options.directDomains);
  }

  if (options.fastFailRegexps) {
    if (_.isArray(options.fastFailRegexps)) {
      options.fastFailRegexps = options.fastFailRegexps.join(",");
    }
    args.push("--fast-fail-regexps", options.fastFailRegexps);
  }

  if (options.verboseDebugging) {
    args.push("--verbose");
  }

  if (options.logfile) {
    args.push("-l", options.logfile);
  }

  if (options.logStats) {
    args.push("--log-stats", options.logStats);
  }

  if (options.maxLogsize) {
    args.push("--max-logsize", options.maxLogsize);
  }

  if (options.doctor) {
    args.push("--doctor");
  }

  if (options.tunnelIdentifier) {
    args.push("--tunnel-identifier", options.tunnelIdentifier);
  }

  args.push("--readyfile", readyfile);

  // Watching file as directory watching does not work on
  // all File Systems http://nodejs.org/api/fs.html#fs_caveats
  watcher = fs.watchFile(readyfile, {persistent: false}, function () {
    fs.exists(readyfile, function (exists) {
      if (exists) {
        logger("Detected sc ready");
        ready();
      }
    });
  });

  watcher.on("error", callback);

  logger("Starting sc with args: " + args
    .join(" ")
    .replace(/-u\ [^\ ]+\ /, "-u XXXXXXXX ")
    .replace(/[0-9a-f]{8}\-([0-9a-f]{4}\-){3}[0-9a-f]{12}/i,
      "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXX"));

  child = spawn(sc.BIN_PATH, args);

  currentTunnel = child;

  child.stdout.on("data", function (data) {
    data = data.toString().trim();
    if (options.verbose && data !== "") {
      console.log(data);
    }

    _.each(dataActions, function (action, key) {
      if (data.indexOf(key) !== -1) {
        action(data);
        return false;
      }
    });
  });

  child.on("exit", function (code, signal) {
    currentTunnel = null;

    if (error) { // from handleError() above
      return callback(error);
    }

    var message = "Closing Sauce Connect Tunnel";
    if (code > 0) {
      message = "Could not start Sauce Connect. Exit code " + code + " signal: " + signal;
      callback(new Error(message));
    }
    logger(message);
  });

  child.close = function (closeCallback) {
    if (closeCallback) {
      child.on("close", function () {
        closeCallback();
      });
    }
    child.kill("SIGTERM");
  };
}

function downloadAndRun(options, callback) {
  if (arguments.length === 1) {
    callback = options;
    options = {};
  }
  logger = options.logger || function () {};

  async.waterfall([
    async.apply(sc.download, options),
    async.apply(run, options),
  ], callback);
}

module.exports = downloadAndRun;
module.exports.download = sc.download;
module.exports.kill = killProcesses;
module.exports.getArchiveName = function() { return sc.ARCHIVE_NAME; };
module.exports.clean = clean;
