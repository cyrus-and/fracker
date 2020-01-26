#!/bin/sh

set -e

ref="${1:?Specify a remote reference}"
git subtree pull -P ext --squash -m "Update Xdebug to $ref" https://github.com/xdebug/xdebug "$ref"
git gc --aggressive
git prune
