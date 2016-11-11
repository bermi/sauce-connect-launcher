var defaultConnectRetryTimeout = 2000;

module.exports = function tryRun(count, options, fn, callback) {
  fn(function (err, result) {
    if (err) {
      if (count < options.connectRetries) {
        return setTimeout(function () {
          tryRun(count + 1, options, fn, callback);
        }, options.connectRetryTimeout || defaultConnectRetryTimeout);
      }

      return callback(err);
    }

    callback(null, result);
  });
};
