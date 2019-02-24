# Fracker

Fracker is a suite of tools that allows to easily trace and analyze PHP function calls, it consists of several components:

- a PHP module (an [Xdebug][] fork) that need to be installed in the environment of the target web application and sends tracing information to the listener;

- a [listener](#listener) application that is in charge of receiving the tracing information and performing some analysis in order to show some meaningful data to the user;

- an [utility script](#deploy-to-a-docker-container) to deploy the PHP module to a Docker container.

The goal is to assist the researcher during manual security assessments of PHP applications.

## Quick demonstration

Spin a new Docker container running Apache with PHP support:

```console
$ docker run --rm -d -p 80:80 --name fracker-test php:apache
```

Create some dummy PHP script:

```console
$ docker exec -i fracker-test tee /var/www/html/index.php <<\EOF
<?php
    function foo($cmd) {
        system('echo ' . preg_replace('/[^a-z]/', '', $cmd));
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
$ curl 'http://localhost/?x=hello+fracker!'
```

Deploy Fracker to the container:

```console
$ ./deploy-docker.sh fracker-test
```

Install the dependencies locally:

```console
$ npm install
```

Start Fracker then run the above `curl` command again:

```console
$ node bin/fracker.js
[+] Listening on 0.0.0.0:6666

1 ┌ GET localhost/?x=hello+fracker!
1 │ {main}()
1 │ »  explode(" ", "hello fracker!")
1 │ »  var_dump(["hello","fracker!"])
1 │ »  foo(cmd="hello")
1 │ »  »  preg_replace("/[^a-z]/", "", "hello")
1 │ »  »  system("echo hello")
1 │ »  foo(cmd="fracker!")
1 │ »  »  preg_replace("/[^a-z]/", "", "fracker!")
1 │ »  »  system("echo fracker")
```

Run again with `-h` and experiment with other options too.

## Architecture

Every PHP request or command line invocation triggers a TCP connection to the listener. The protocol is merely a stream of newline-terminated JSON objects from the PHP module to the listener, such objects contains information about the current request, the calls performed and the return values.

This allows users to easily implement their own tools; the provided listener application can be used as a reference.

<!-- TODO document the JSON objects -->

## Setup

### PHP module

The PHP module is forked from [Xdebug][], the untouched README can be found [here](README.rst) if needed. The installation process is fairly the same so the troubleshooting.

#### Deploy to a Docker container

The most convenient way to use Fracker is probably to deploy it to the Docker container where the web server resides. The [`deploy-docker.sh`](deploy-docker.sh) script tries to do exactly that so that it works out-of-the-box with Debian-like distros.

Run it like:

```console
$ ./deploy-docker.sh <container_name>
```

This script assumes that a [listener](#listener) application will be bound to the port 6666 of the host running Docker.

#### Manual setup

The above script is a shorthand for the following operations.

Build the PHP module with:

```console
$ phpize
$ ./configure
$ make
```

(To rebuild after nontrivial code changes just rerun `make`.)

Clean the source directory with:

```console
$ make distclean
$ phpize --clean
```

To check that everything is working fine, start the [listener](#listener), then run PHP like this:

```console
$ php -d "zend_extension=$PWD/.libs/xdebug.so" # ...
```

Finally, install the PHP extension in the usual way, briefly:

1. `make install`;
2. place `zend_extension=xdebug.so` in a readable INI file.

### Listener

Install with:

```console
$ npm install
$ npm install -g . # optional
```

Then just run `fracker`, otherwise run it locally with `node bin/main.js`.

## Configuration

The [`fracker.ini`](fracker.ini) file serves as a template for the most common settings to be used with Fracker.

## License

This product includes Xdebug, freely available from <https://xdebug.org/>. Unless explicitly stated otherwise, for the PHP module itself, the copyright is retained by the original authors (see [LICENSE](LICENSE)).

The listener application instead is released under the [MIT](package.json) license.


[Xdebug]: https://github.com/xdebug/xdebug
