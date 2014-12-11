// Only download on install when requested.
if (!process.env.SAUCE_CONNECT_DOWNLOAD_ON_INSTALL) {
  return;
}

var sauceConnectLauncher = require('..');

sauceConnectLauncher.download({
  logger: console.log.bind(console),
}, function(error) {
  if (error) {
    console.log('Failed to download sauce connect binary:', error);
    console.log('sauce-connect-launcher will attempt to re-download next time it is run.');
  }
});
