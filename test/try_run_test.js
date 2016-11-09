var tryRun = require("../lib/try_run");
var expect = require("expect.js");

describe("tryRun", function () {
  var innerErr = new Error("Inner function failed");

  describe("without configured retry", function () {
    it("calls the provided function once", function (done) {
      var innerCalls = 0;
      tryRun(0, {}, function (options, callback) {
        innerCalls += 1;
        callback(innerErr);
      }, function (err) {
        expect(err).to.equal(innerErr);
        done();
      });
    });
  });

  describe("with configured retry", function () {
    var retryTimeout = 10;
    var retryOptions = {
      connectRetries: 2,
      connectRetryTimeout: retryTimeout
    };

    it("calls the provided function once when no error is returned", function (done) {
      var innerCalls = 0;
      tryRun(0, retryOptions, function (options, callback) {
        innerCalls += 1;
        callback(null);
      }, function (err) {
        expect(err).to.not.be.ok();
        expect(innerCalls).to.be(1);
        done();
      });
    });

    it("retries up-to connectRetries when the function returns an error", function (done) {
      var innerCalls = 0;
      tryRun(0, retryOptions, function (options, callback) {
        innerCalls += 1;
        callback(innerErr);
      }, function (err) {
        expect(err).to.equal(innerErr);
        expect(innerCalls).to.be(3);
        done();
      });
    });

    it("waits connectRetryTimeout between retries", function (done) {
      var innerCalls = 0;
      var start = Date.now();
      tryRun(0, retryOptions, function (options, callback) {
        innerCalls += 1;
        callback(innerErr);
      }, function () {
        var end = Date.now();
        expect(end - start).greaterThan(19); // Double timeout-1
        done();
      });
    });
  });
});
