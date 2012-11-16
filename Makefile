test:
	npm test

test-instrument:
	jscoverage js js-cov

test-clean-instrument:
	rm -rf js-cov

test-coverage-report:
	COVERAGE=1 mocha --reporter html-cov > test/coverage.html

test-coverage: test-clean-instrument test-instrument test-coverage-report

.PHONY: default test test-coverage test-clean-instrument test-instrument test-coverage-report

default: test-coverage
