// Only download on install if installing globally or the environment variable
// SAUCE_CONNECT_DOWNLOAD_ON_INSTALL=true is defined
if (process.env.npm_config_global === "" &&
  !process.env.SAUCE_CONNECT_DOWNLOAD_ON_INSTALL) {
  return;
}

function downloadSauceConnectLauncher(callback) {
  try {
    var sauceConnectLauncher = require("../");
    sauceConnectLauncher.download({
      logger: console.log.bind(console),
    }, callback);
  } catch (e) {
    callback(e);
  }
}

// https://github.com/npm/npm/issues/6624
// Make sure we have all the dependencies in place before attempting the
// download
function installNpmDependencies(callback) {
  var npmDependencies = require("../package.json").dependencies,
    installDependenciesCommand = "npm install " +
      (Object.keys(npmDependencies).map(function (key) {
        return key + "@" + npmDependencies[key];
      })).join(" ");
  require("child_process").exec(installDependenciesCommand, {
    cwd: require("path").normalize(__dirname + "/../")
  }, callback);
}

// Attempt to download sauce connect launcher. It's possible that npm
// has already installed all the pre-requisites but there's a chance it doesn't
// https://github.com/bermi/sauce-connect-launcher/issues/42
// https://github.com/bermi/sauce-connect-launcher/pull/40
downloadSauceConnectLauncher(function (err) {
  if (err) {
    installNpmDependencies(function (err) {
      if (err) {
        throw err;
      }
      downloadSauceConnectLauncher(function (err) {
        if (err) {
          console.log("Failed to download sauce connect binary:", err);
          console.log("sauce-connect-launcher will attempt to re-download " +
            "next time it is run.");
        }
      });
    });
  }
});
