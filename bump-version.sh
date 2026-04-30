#!/bin/sh
# bump-version.sh: Bump version (patch, minor, or major), update version.ts, stage, and commit
# Usage: ./bump-version.sh [patch|minor|major]
set -e

BUMP_TYPE=${1:-patch}
npm --no-git-tag-version version "$BUMP_TYPE"
npx genversion --es6 --double --semi version.ts
git add package.json package-lock.json version.ts
version=$(node -p 'require("./package.json").version')
git commit -m "update version to $version"
