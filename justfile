# List all recipies
default:
    just --list --unsorted

# Generate the site
gen:
	psibi.in build

# Watch and run the site
watch:
	psibi.in watch

# Clean site
clean:
	psibi.in clean

# Watch and install new exectuable
build:
	stack install --fast --file-watch --local-bin-path=/home/sibi/bin
