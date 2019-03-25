#!/bin/sh

set -e

git subtree pull -P ext --squash -m 'Update Xdebug' https://github.com/xdebug/xdebug master
git gc --aggressive
git prune
