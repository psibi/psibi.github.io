# List all recipies
default:
    just --list --unsorted

# Generate the site
gen:
	psibi.in build

# Watch and run the site
watch:
	stack run -- psibi.in watch

# Clean site
clean:
	psibi.in clean

# Watch and install new exectuable
build:
	stack build --fast --file-watch
