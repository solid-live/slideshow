#!/bin/bash

npm --no-git-tag-version version patch

git add -u
git commit -m "$1"
git push origin master

npm publish

