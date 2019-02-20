# Fracker

This is a fork of [Xdebug][], only some default values have been changed and some new features introduced. The original README can be found [here](README.rst) if really needed.

<!-- TODO add project brief -->

[Xdebug]: https://github.com/xdebug/xdebug

## Deploy to a Docker container

Run the script [`deploy-docker.sh`](deploy-docker.sh) and specify a Docker container running a Debian-like distro.

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

Then run PHP from the root like this:

```
php -d "zend_extension=$PWD/.libs/xdebug.so" # ...
```

## Configuration

The [`fracker.ini`](fracker.ini) file serves as a template for the most common settings to be used with Fracker.
