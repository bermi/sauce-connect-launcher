# sauce-connect-launcher

[![Build Status](https://secure.travis-ci.org/bermi/sauce-connect-launcher.png)](http://travis-ci.org/bermi/sauce-connect-launcher)

A library to download and launch Sauce Connect.

## Installation

```sh
npm install sauce-connect-launcher
```

## Usage


```javascript

var sauceConnectLauncher = require('sauce-connect-launcher'),
	options = {
		username: 'bermi',
		accessKey: '12345678-1234-1234-1234-1234567890ab',
		verbose: false,
		logger: console.log
	};

sauceConnectLauncher(options, function (err, sauceConnectProcess) {
	console.log("Started Sauce Connect Process");
	sauceConnectProcess.close(function () {
		console.log("Closed Sauce Connect process");
	});
});

```

## Testing

```sh
npm test
```
