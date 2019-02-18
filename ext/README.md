# fracker

This is a fork of [Xdebug][], only some default values have been changed and some new features introduced. The original README can be found [here](README.rst).

<!-- TODO add project brief -->

[Xdebug]: https://github.com/xdebug/xdebug

## Set up a Docker container running Debian

Run the script `setup-docker-debian.sh`.

## Build

```
phpize
./configure
make
```

To rebuild after nontrivial code changes just rerun `make`.

## Clean

```
make distclean
phpize --clean
```

## Try

Start a TCP server to receive the JSON stream, for example:

```
socat tcp-listen:6666,fork,reuseaddr exec:jq\ .,fdout=0
```

Remember that each PHP request triggers a request to the TCP server.

Then run PHP like this:

```
php -c fracker/fracker.ini -d "zend_extension=$PWD/.libs/xdebug.so" # ...
```
