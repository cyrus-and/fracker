# Fracker

Fracker is a suite of tools that allows to easily trace and analyze PHP function calls, it consists of several components:

- a PHP extension (an [Xdebug][] fork) that need to be installed in the environment of the target web application and sends tracing information to the listener;

- a [listener](#listener) application that is in charge of receiving the tracing information and performing some analysis in order to show some meaningful data to the user;

- an [utility script](#deploy-to-a-docker-container) to deploy the PHP extension to a Docker container.

The goal is to assist the researcher during manual security assessments of PHP applications.

## Quick demonstration

Spin a new Docker container running Apache with PHP support:

```console
$ docker run --rm -d -p 80:80 --name hello-fracker php:apache
```

Create some dummy PHP script:

```console
$ docker exec -i hello-fracker tee /var/www/html/index.php <<\EOF
<?php
    function foo($cmd) {
        system('echo ' . preg_replace('/[^a-z]/i', '', $cmd));
    }

    $a = explode(' ', $_GET['x']);
    var_dump($a);
    foreach ($a as $cmd) {
        foo($cmd);
    }
EOF
```

Test that the PHP file is properly served:

```console
$ curl 'http://localhost/?x=Hello+Fracker!'
```

Deploy Fracker to the container:

```console
$ scripts/deploy.sh hello-fracker
```

Install the dependencies locally:

```console
$ ( cd app; npm install )
```

Start Fracker then run the above `curl` command again:

```console
$ app/bin/fracker.js
[+] Listening on 0.0.0.0:6666

1 ┌ GET localhost/?x=Hello+Fracker!
1 │ {main}()
1 │ »  explode(" ", "Hello Fracker!")
1 │ »  var_dump(["Hello", "Fracker!"])
1 │ »  foo(cmd="Hello")
1 │ »  »  preg_replace("/[^a-z]/i", "", "Hello")
1 │ »  »  system("echo Hello")
1 │ »  foo(cmd="Fracker!")
1 │ »  »  preg_replace("/[^a-z]/i", "", "Fracker!")
1 │ »  »  system("echo Fracker")
```

Run again with `-h` and experiment with other options too.

## Architecture

Every PHP request or command line invocation triggers a TCP connection to the listener. The protocol is merely a stream of newline-terminated JSON objects from the PHP extension to the listener, such objects contains information about the current request, the calls performed and the return values.

This allows users to easily implement their own tools; the provided listener application can be used as a reference.

<!-- TODO document the JSON objects -->

## Setup

### PHP extension

The PHP extension is forked from [Xdebug][], the untouched README can be found [here](ext/README.rst) if needed. The installation process is fairly the same so the troubleshooting.

#### Deploy to a Docker container

The most convenient way to use Fracker is probably to deploy it to the Docker container where the web server resides. The [`deploy.sh`](scripts/deploy.sh) script tries to do exactly that so that it works out-of-the-box with Debian-like distros.

Run it like:

```console
$ scripts/deploy.sh <container> [<port>]
```

This script assumes that a [listener](#listener) application will be bound to the port 6666 of the host running Docker.

#### Manual setup

The above script is a shorthand for the following operations (to be run in the `ext` directory).

Build the PHP extension with:

```console
$ phpize
$ ./configure
$ make
```

(To rebuild after nontrivial code changes just rerun `make`.)

To check that everything is working fine, start the [listener](#listener), then run PHP like this:

```console
$ php -d "zend_extension=$PWD/ext/.libs/xdebug.so" -r 'var_dump("Hello Fracker!");'
```

Finally, install the PHP extension in the usual way, briefly:

1. `make install`;
2. place `zend_extension=xdebug.so` in a INI file parsed by PHP.

Clean the source directory with:

```console
$ make distclean
$ phpize --clean
```

### Listener

Install with (to be run in `app` directory):

```console
$ npm install
$ npm install -g . # optional
```

Then just run `fracker`, otherwise run it locally with `node app/bin/fracker.js`.

## Configuration

The following serves as a template for the most common settings to be used with Fracker:

```ini
; trace only those requests with XDEBUG_TRACE=FRACKER in GET, POST or cookie
;xdebug.auto_trace = 0
;xdebug.trace_enable_trigger = 1
;xdebug.trace_enable_trigger_value = FRACKER

; do not collect function arguments
;xdebug.collect_params = 0

; do not collect return values
;xdebug.collect_return = 0

; fracker JSON server
;xdebug.trace_fracker_host = 127.0.0.1
;xdebug.trace_fracker_port = 6666
```

## License

This product includes Xdebug, freely available from <https://xdebug.org/>. Unless explicitly stated otherwise, for the PHP extension itself, the copyright is retained by the original authors (see [LICENSE](ext/LICENSE)).

The listener application instead is released under the [MIT](app/package.json) license.


[Xdebug]: https://github.com/xdebug/xdebug
