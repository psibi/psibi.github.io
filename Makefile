.DEFAULT_GOAL = help
SHELL=bash

## Generate the site
gen:
	psibi.in build

## Watch and run the site
watch:
	psibi.in watch

## Clean site
clean:
	psibi.in clean

## Watch and install new exectuable
build:
	stack install --fast --file-watch

## Show help screen.
help:
	@echo "Please use \`make <target>' where <target> is one of\n\n"
	@awk '/^[a-zA-Z\-\_0-9]+:/ { \
		helpMessage = match(lastLine, /^## (.*)/); \
		if (helpMessage) { \
			helpCommand = substr($$1, 0, index($$1, ":")); \
			helpMessage = substr(lastLine, RSTART + 3, RLENGTH); \
			printf "%-30s %s\n", helpCommand, helpMessage; \
		} \
	} \
	{ lastLine = $$0 }' $(MAKEFILE_LIST)
