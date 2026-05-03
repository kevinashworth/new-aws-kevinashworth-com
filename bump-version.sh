#!/bin/sh
# bump-version.sh: Bump version (patch, minor, or major), update version.ts, stage, and commit
# Usage: ./bump-version.sh [patch|minor|major]
set -e

BUMP_TYPE=${1:-patch}
npm --no-git-tag-version version "$BUMP_TYPE"
npx genversion --es6 --double --semi src/version.ts
git add package.json package-lock.json src/version.ts
version=$(sed -n 's/export const version = "\([^"]*\)";/\1/p' src/version.ts)
git commit -m "update version to $version"
