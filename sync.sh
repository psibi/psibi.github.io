#!/bin/bash
#Author: Sibi <sibi@psibi.in>

# Script for pushing my Hakyll blog pages
# Argument: Directory name of the git repository

cd $1
git checkout source
cp -r $1/_site/ /tmp
git checkout master
cp -r /tmp/_site $1/
git add .
git commit -m "Site updated"
git checkout source
echo "Done, test your site!"

