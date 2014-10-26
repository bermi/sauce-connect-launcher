var sauceConnectLauncher = require('..');

sauceConnectLauncher.download({
  logger: console.log.bind(console),
}, function(error) {
  if (error) {
    console.log('Failed to download sauce connect binary:', error);
    console.log('sauce-connect-launcher will attempt to re-download next time it is run.');
  }
});
