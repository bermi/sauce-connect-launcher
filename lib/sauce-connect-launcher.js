var
  fs = require('fs'),
  path = require('path'),
  ProgressBar = require('progress'),
  http = require('http'),
  unzip = require('unzip'),
  spawn = require('child_process').spawn,
  EventEmitter = require('events').EventEmitter,
  util = require('util'),
  jarfile = path.normalize(__dirname + '/Sauce-Connect.jar'),
  outfile = path.normalize(__dirname + '/Sauce-Connect-latest.zip'),
  openProcesses = [],
  logger = console.log,
  cleanup_registered = false;


// Make sure all processes have been closed
// when the script goes down
function closeOnProcessTermination() {
  if (cleanup_registered) {
    return;
  }
  cleanup_registered = true;
  process.on('exit', function (err) {
    logger("Shutting down");
    while (openProcesses.length) {
      var fakeProcess = openProcesses.pop();
      try {
        fakeProcess.emit("exit");
        fakeProcess.kill('SIGTERM');
      } catch (e) {}
    }
  });
}

function download(options, callback) {
  var req = http.request({
      host: 'saucelabs.com',
      port: 80,
      path: '/downloads/Sauce-Connect-latest.zip'
    });

  logger("Missing Sauce Connect local proxy, downloading dependency");
  logger("This will only happen once.");

  req.on('response', function (res) {

    logger("Downloading ", res.headers['content-length'], "bytes");

    var bar, len = parseInt(res.headers['content-length'], 10);

    res.pipe(fs.createWriteStream(outfile));

    logger();
    if (!options.no_progress) {
      bar = new ProgressBar('  downloading Sauce-Connect-latest.zip [:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: len
      });

      res.on('data', function (chunk) {
        bar.tick(chunk.length);
      });
    }

    res.on('end', function () {
      logger('\n');
      logger("Unzipping Sauce-Connect-latest.zip");
      setTimeout(function () {
        fs.createReadStream(outfile)
          .pipe(unzip.Parse())
          .on('entry', function (entry) {
            if (entry.path.match(/Sauce-Connect\.jar$/)) {
              logger("Saving Sauce-Connect.jar");
              var jar = fs.createWriteStream(jarfile);
              entry.on('end', function (err) {
                // write queued data before closing the stream
                logger("Removing Sauce-Connect-latest.zip");
                fs.unlink(outfile, function (err) {
                  setTimeout(function () {
                    logger("Sauce Connect installed correctly");
                    callback(null);
                  }, 500);
                });
              });
              entry.pipe(jar);
            }
          });
      }, 1000);

    });

  });

  req.end();
}



function run(options, callback) {
  logger("Opening local tunnel using Sauce Connect");
  var child,
    args = ["-jar", jarfile, options.username, options.accessKey];

  if (options.port) {
    args.push("-P", options.port);
  }

  if(options.logfile) {
    args.push('-l',options.logfile);
  }  

  child = spawn("java", args);
  child.stdout.on("data", function (data) {
    var connectingText = 'Please wait for "You may start your tests" to start your tests',
      readyText = "Connected! You may start your tests",
      outdatedText = "This version of Sauce Connect is outdated",
      errorText = "Exception: ",
      credentialsError = "java.io.IOException: Server returned HTTP response code: 401",
      shutDown = "Finished shutting down tunnel remote VM";

    data = data.toString();
    if (options.verbose) {
      console.log(data);
    }

    if (data.indexOf(connectingText) !== -1) {
      logger("Creating tunnel with Sauce Labs");
    } else if (data.indexOf(readyText) !== -1) {
      logger("Testing tunnel ready");
      closeOnProcessTermination();
      callback(null, child);
    } else if (data.indexOf(credentialsError) !== -1) {
      logger("Invalid Sauce Connect Credentials");
      callback(new Error("Invalid Sauce Connect Credentials. " + data), child);
    } else if (data.indexOf(errorText) !== -1) {
      logger("Sauce Connect Error");
      callback(new Error(data), child);
    }
  });
  child.on('exit', function (code, signal) {
    if (code > 0) {
      callback(new Error("Could not start Sauce Connect. Exit code " + code));
    }
  });

  openProcesses.push(child);

  child.close = function () {
    child.kill('SIGTERM');
  };
}

function downloadAndStartProcess(options, callback) {

  if (arguments.length === 1) {
    callback = options;
    options = {};
  }
  logger = options.logger || function () {};
  (fs.exists || path.exists)(jarfile, function (exists) {
    if (exists) {
      run(options, callback);
    } else {
      // Being downloaded?
      (fs.exists || path.exists)(outfile, function (exists) {
        if (!exists) {
          download(options, function (err) {
            if (err) {
              return callback(err);
            }
            run(options, callback);
          });
        } else {
          // The file is already being downloaded
          // by another process, lets poll until
          // it's available to be used
          setTimeout(function () {
            downloadAndStartProcess(options, callback);
          }, 1000);
        }
      });
    }
  });
}



module.exports = downloadAndStartProcess;


