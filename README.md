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
		logfile: null, //optionally change sauce connect logfile location
		logger: console.log,
		no_progress: false // optionally hide progress bar
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

## License

(The MIT License)

Copyright (c) 2013 Bermi Ferrer &lt;bermi@bermilabs.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
