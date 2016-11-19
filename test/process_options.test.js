var processOptions = require("../lib/process_options.js");
var expect = require("expect.js");

describe("processOptions", function () {
  var prevUser, prevKey;

  before(function () {
    prevUser = process.env.SAUCE_USERNAME;
    prevKey = process.env.SAUCE_ACCESS_KEY;
    delete process.env.SAUCE_USERNAME;
    delete process.env.SAUCE_ACCESS_KEY;
  });

  after(function () {
     process.env.SAUCE_USERNAME = prevUser;
     process.env.SAUCE_ACCESS_KEY = prevKey;
  });

  it("should process user and password", function () {
    var result = processOptions({username: "bermi", accessKey: "1234"});
    expect(result).to.be.an(Array);
    expect(result).to.eql([
      "-u", "bermi",
      "-k", "1234"
    ]);
  });

  it("should process user and password as env vars", function () {
    process.env.SAUCE_USERNAME = "bermi";
    process.env.SAUCE_ACCESS_KEY = "1234";
    var result = processOptions({});
    expect(result).to.be.an(Array);
    expect(result).to.eql([
      "-u", "bermi",
      "-k", "1234"
    ]);
    delete process.env.SAUCE_USERNAME;
    delete process.env.SAUCE_ACCESS_KEY;
  });

  it("should handle proxy ports", function () {
    expect(processOptions({port: 1234})).to.eql(["-P", 1234]);
  });

  it("should handle boolean flags", function () {
    var result = processOptions({doctor: true});
    expect(result).to.eql(["--doctor"]);
  });

  it("should handle array values", function () {
    var result = processOptions({directDomains: ["google.com", "asdf.com"]});
    expect(result).to.eql(["--direct-domains", "google.com,asdf.com"]);
  });

  it("should handle future options", function () {
    var result = processOptions({
      someFutureOption: "asdf",
      futureBoolean: true
    });
    expect(result).to.eql(["--some-future-option", "asdf", "--future-boolean"]);
  });

  it("should omit special launcher flags", function () {
    expect(processOptions({
      readyFileId: "1",
      verbose: true,
      logger: function () {},
      connectRetries: 1,
      connectRetryTimeout: 5000,
      detached: true,
      connectVersion: "1.2.3"
    })).to.eql([]);
  });

  it("should handle 'vv' flag", function() {
    var result = processOptions({vv: true});
    expect(result).to.eql(["-vv"]);
  });

});
