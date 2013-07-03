SHELL = /bin/bash
export PATH := ./node_modules/.bin/:${PATH}

# The default action will lint the code and run all the tests
default: ci

# Shows available commands
help:
	@make -qp | grep '^[^\# \n\\.]' | grep '^[a-z]' | grep -v '=' | cut -f1 -d ":" | sort

test:
	mocha

test-instrument:
	jscoverage lib/ lib-cov/

test-clean-instrument:
	rm -rf lib-cov/

test-coverage-report:
	COVERAGE=1 mocha --reporter html-cov > test/coverage.html

test-coverage: test-clean-instrument test-instrument test-coverage-report

# Lints the code
lint:
	@make setup
	@grunt jshint

all:
	@make setup
	grunt

dev:
	make all && \
	grunt watch

# Creates new releases by running these steps
#
# 1. bump the version in your package.json file.
# 2. stage the package.json file's change.
# 3. commit that change with a message like "release 0.6.22".
# 4. create a new git tag for the release.
# 5. push the changes out to bitbucket.
# 6. also push the new tag out to bitbucket.
release:
	@make install-grunt-release
	@make ci
	@grunt release$(RELEASEFLAGS)

# Releases updating only the patch number 0.0.#
release-patch:
	@RELEASEFLAGS=":patch" make release

# Releases updating the minor number 0.#.0 and setting the patch to 0
release-minor:
	@RELEASEFLAGS=":minor" make release

# Releases updating the major number #.0.0 and setting the minor and patch to 0
release-major:
	@RELEASEFLAGS=":major" make release

# Installs npm dependencies
# There is no output on npm install as we will need to run this
# step when running CI tests
setup:
	@test -d node_modules || (\
		echo "# Setting up dev environment (this might take a while). If something goes wrong, please run: npm install; npm rebuild; manually"; \
		(\
			npm install --silent > /dev/null &&\
			make install-grunt-release \
		); \
	true);
	@make setup-sauce

setup-sauce:
	@test -f user.json || (\
		read -p "Sauce Labs Username: " name && \
		read -p "Sauce Labs Access key: " key && \
		echo "{\"username\": \"$$name\", \"accessKey\": \"$$key\"}" > user.json \
		)


# grunt-release can't be installed via package.json as some coffee dependencies prevent it from running atomically
install-grunt-release:
	@npm install grunt-release --silent > /dev/null; true

# Version
version:
	node -e "console.log(require('./package.json').version)"

# Continuous Integration Test Runner
ci:
	@TESTEMFLAGS=ci make test

.PHONY: default test test-coverage test-clean-instrument test-instrument test-coverage-report help setup ci release release-major release-minor release-patch
