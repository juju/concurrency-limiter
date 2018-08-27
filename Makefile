.DEFAULT_GOAL := setup

PROJECT=concurrency-limiter
NODE_MODULES = node_modules

$(NODE_MODULES):
	npm install
	npm ls --depth=0

.PHONY: check
check: lint test

.PHONY: clean
clean:
	rm -rfv $(NODE_MODULES)/
	rm -fv package-lock.json

.PHONY: help
help:
	@echo -e '$(PROJECT) - list of make targets:\n'
	@echo 'make test - run tests'
	@echo 'make lint - run linter'
	@echo 'make check - run both linter and tests'
	@echo 'make clean - get rid of development and build artifacts'
	@echo 'make release - publish a release on npm'

.PHONY: lint
lint: setup
	npm run lint

.PHONY: release
release: clean check
	$(eval current := $(shell npm view $(PROJECT) version))
	$(eval package := $(shell npm version | grep $(PROJECT) | cut -d "'" -f 2))
	@test $(current) != $(package) || ( \
		echo cannot publish existing version $(current): update package.json; \
		exit 1 \
	)
	git tag $(package)
	git push --tags
	npm publish

.PHONY: setup
setup: $(NODE_MODULES)

.PHONY: test
test: setup
	npm t
