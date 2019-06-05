# Fracker [![Build Status][]][travis]

[Build Status]: https://travis-ci.org/cyrus-and/fracker.svg?branch=master
[travis]: https://travis-ci.org/cyrus-and/fracker

Fracker is a suite of tools that allows to easily trace and analyze PHP function calls, its goal is to assist the researcher during manual security assessments of PHP applications.

It consists of:

- a [PHP extension](#php-extension) that needs to be installed in the environment of the target web application that sends tracing information to the listener;

- a [listener application](#listener-application) that is in charge of receiving the tracing information and performing some analysis in order to show some meaningful data to the user.

![Screenshot](https://i.imgur.com/N6uZVyy.png)

## Demo

1.  Clone or download this repository then move into the root directory.

2.  Spin a new Docker container running Apache with PHP support:

    ```console
    $ docker run --rm -d -p 80:80 --name hello-fracker php:apache
    ```

3.  Create some dummy PHP script as index:

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

4.  Test that the PHP file is properly served:

    ```console
    $ curl 'http://localhost/?x=Hello+Fracker!'
    ```

5.  Deploy Fracker to the container:

    ```console
    $ scripts/deploy.sh hello-fracker
    ```

6.  Install the dependencies locally (this just needs to be performed once):

    ```console
    $ npm install -C app
    ```

7.  Start Fracker with:

    ```console
    $ app/bin/fracker.js
    ```

8.  Run the above `curl` command again. (The output should be similar to the above screenshot.)

9.  Run Fracker again with `--help` and experiment with other options too.

10. Stop and remove the container:

    ```console
    $ docker stop hello-fracker
    ```

## Architecture

Every PHP request or command line invocation triggers a TCP connection with the listener. The protocol is merely a stream of newline-terminated JSON objects from the PHP extension to the listener, such objects contain information about the current request, the calls performed and the return values.

This decoupling allows the users to implement their own tools. Raw JSON objects can be inspected by dumping the stream content to standard output, for example:

```console
$ socat tcp-listen:6666,fork,reuseaddr 'exec:jq .,fdout=0'
```

## PHP extension

The PHP extension is forked from [Xdebug][] hence the installation process is fairly the same so is the troubleshooting.

The most convenient way to use Fracker is probably to deploy it to the Docker container where the web server resides using the [provided script](#deploy-script). Use the [manual approach](#manual-setup) for a more versatile solution.

[Xdebug]: https://github.com/xdebug/xdebug

### Deploy script

This script should work out-of-the-box with Debian-like distributions:

```console
$ scripts/deploy.sh <container> [<port> [<host>]]
```

It configures the PHP module to connect to specified host on the specified port (defaults to the host running Docker and port 6666).

### Manual setup

Install the PHP development files and other dependencies. For example, on a Debian-like distribution:

```console
$ apt-get install php7.0-dev libjson-c-dev pkg-config
```

The following operations need to be performed in the `ext` directory.

Build the PHP extension with:

```console
$ phpize
$ ./configure
$ make
```

(To rebuild after nontrivial code changes just rerun `make`.)

To check that everything is working fine, start the [listener application](#listener-application) then run PHP like this:

```console
$ php -d "zend_extension=$PWD/.libs/xdebug.so" -r 'var_dump("Hello Fracker!");'
```

Finally, install the PHP extension in the usual way, briefly:

1. `make install`;
2. place `zend_extension=xdebug.so` in a INI file parsed by PHP along with any other custom [settings](#settings).

Clean the source directory with:

```console
$ make distclean
$ phpize --clean
```

#### Settings

The following serves as a template for the most common settings to be used with Fracker:

```ini
; trace only those requests with XDEBUG_TRACE=FRACKER in GET, POST or cookie
xdebug.auto_trace = 0
xdebug.trace_enable_trigger = 1
xdebug.trace_enable_trigger_value = FRACKER

; do not collect function arguments
xdebug.collect_params = 0

; do not collect return values
xdebug.collect_return = 0

; custom application address
xdebug.trace_fracker_host = 127.0.0.1
xdebug.trace_fracker_port = 6666
```

## Listener application

The provided listener application is a Node.js package. Install the dependencies with:

```console
$ npm install -C app
```

Optionally install the executable globally by creating a symlink to this folder:

```console
$ npm install -g app
```

Then just run `fracker`, or run it locally with `app/bin/fracker.js`.

### Configuration

Command line options in long format can be written in YAML files (camel case) and passed as command line arguments. Multiple files with increasing priority can be specified, but command line options will have the highest priority.

For convenience some [configuration files][configs] listing some classes of *interesting* PHP functions are provided along with this repo. Use them like:

```console
$ fracker app/configs/file-* # ...
```

[configs]: app/configs/

## License

This product includes Xdebug, freely available from <https://xdebug.org/>. Unless explicitly stated otherwise, for the PHP extension itself, the copyright is retained by the original authors.

The listener application instead is released under a [different](app/LICENSE) license.
