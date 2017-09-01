#!/usr/bin/env bash
#
# !!! Assumed to be run via a npm run command !!!
#
set -e

DIST=dist/

# Clean up
rm -rf "$DIST"
mkdir -p "$DIST"

# Copy assets
cp LICENSE README.md tools/assets/dist/* "$DIST"

# Transcode and bundle tests in a formats nodejs, browsers and transpiller can load.
NODE_ENV=production rollup -c

cd "$DIST"; npm version --no-git-tag-version "$npm_package_version"
