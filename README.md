# Fracker

[![CI status](https://github.com/cyrus-and/fracker/actions/workflows/ci.yml/badge.svg)](https://github.com/cyrus-and/fracker/actions?query=workflow:CI)

Fracker is a suite of tools that allows to easily trace and analyze PHP function calls, its goal is to assist the researcher during manual security assessments of PHP applications.

It consists of:

- a [PHP extension](#php-extension) that needs to be installed in the environment of the target web application which sends tracing information to the listener application;

- a [listener application](#listener-application) that runs locally and is in charge of receiving the tracing information from the PHP extension and performing some analysis in order to show some meaningful data to the user.

![Screenshot](https://gist.githubusercontent.com/cyrus-and/20e1fe4ae91fcd3c823262e7e8344a75/raw/2ccc21c6d82caf49c8e0315a7edd4397b2c51669/screenshot.png)

## Setup

Install the PHP extension, either by using the [deploy script](#deploy-script) or [manually](#manual-setup), then install the listener application [locally](#installation).

## Demo

1. Install the [listener application](#installation).

2. Spin a disposable Docker container:

    ```console
    docker run --rm -d -p 80:80 -v "$PWD/demo/:/var/www/html/" --name hello-fracker php:8.2-apache
    ```

3. Test that the demo PHP application works:

    ```console
    curl 'http://localhost/?x=Hello+Fracker!'
    ```
    ```
    array(2) {
      [0]=>
      string(5) "Hello"
      [1]=>
      string(8) "Fracker!"
    }
    Hello
    Fracker
    ```

4. Deploy Fracker to the container using the [deploy script](#deploy-script):

    ```console
    ./scripts/deploy.sh hello-fracker
    ```

5. Start Fracker in another terminal, then repeat the above `curl` command:

    ```console
    fracker
    ```
    ```
    +++ │ Listening on 0.0.0.0:6666
    +++ │
    001 │ GET localhost/?x=Hello+Fracker!
    001 │ {main}() /var/www/html/index.php +0
    001 │ »  explode(separator=" ", string="Hello Fracker!") /var/www/html/index.php +7
    001 │ »  var_dump(value=["Hello", "Fracker!"], values=null) /var/www/html/index.php +9
    001 │ »  foo(cmd="Hello") /var/www/html/index.php +12
    001 │ »  »  preg_replace(pattern="/[^a-z]/i", replacement="", subject="Hello") /var/www/html/index.php +4
    001 │ »  »  system(command="echo Hello") /var/www/html/index.php +4
    001 │ »  foo(cmd="Fracker!") /var/www/html/index.php +12
    001 │ »  »  preg_replace(pattern="/[^a-z]/i", replacement="", subject="Fracker!") /var/www/html/index.php +4
    001 │ »  »  system(command="echo Fracker") /var/www/html/index.php +4
    +++ │
    +++ │ Shutting down...
    ```

6. Press Ctrl-C to exit, then run Fracker again with `--help` and experiment with other options too...

7. Remove the container and the associated image:

    ```console
    docker stop hello-fracker
    docker rmi hello-fracker
    ```

## Architecture

Every PHP request or command line invocation triggers a TCP connection with the listener. The protocol is merely a stream of newline-terminated JSON objects from the PHP extension to the listener, such objects contain information about the current request, the calls performed, and the return values.

This decoupling allows the users to implement their own tools. Raw JSON objects can be inspected by dumping the stream content to standard output, for example:

```console
socat tcp-listen:6666,fork,reuseaddr 'exec:jq .,fdout=0'
```

## PHP extension

The PHP extension is forked from [Xdebug](https://github.com/xdebug/xdebug), hence the installation process is fairly the same, so is the troubleshooting.

The most convenient way to use Fracker is probably to deploy it to the Docker container where the web server resides using the provided [deploy script](#deploy-script), use the [manual setup](#manual-setup) for a more versatile solution.

### Deploy script

This script should work out-of-the-box with Debian-like distributions:

```console
./scripts/deploy.sh <container> [<port> [<host>]]
```

It configures the PHP module to connect to specified host on the specified port (defaults to the host running Docker and port 6666).

### Manual setup

Install the PHP development files and other dependencies. For example, on a Debian-like distribution:

```console
apt-get install php8.2-dev libjson-c-dev pkg-config
```

Then move into the `./ext/` directory and just run `make` to fetch Xdebug, apply the patch, and build Fracker.

(To rebuild after nontrivial code changes just run `make` inside the `./ext/xdebug/` directory.)

To check that everything is working fine, start the [listener application](#listener-application) then run PHP like this:

```console
php -d "zend_extension=$PWD/xdebug/modules/xdebug.so" -r 'var_dump("Hello Fracker!");'
```

Finally, install the PHP extension in the usual way, briefly:

1. copy `./ext/xdebug/modules/xdebug.so` to the PHP extension directory;

2. place `zend_extension=xdebug.so` in a INI file parsed by PHP, along with any other custom [settings](#settings) if needed.

At this point the source repository is no more needed, you can run `make cleanall` to clean everything up.

### Settings

The default INI settings should work just fine in most cases. The following serves as a template for some common ways to override the default values:

```ini
; change the address of the listener application
xdebug.trace_fracker_host = 10.10.10.10
xdebug.trace_fracker_port = 1234

; trace only those requests with XDEBUG_TRACE=FRACKER in GET, POST or cookies
xdebug.start_with_request = trigger
xdebug.trigger_value = FRACKER
```

## Listener application

The provided listener application is a [Node.js](https://nodejs.org/en) package, it is commonly installed locally, but it can resides anywhere, provided that it can be reached by the PHP extension.

### Installation

Install the dependencies with:

```console
npm install -C ./app/
```

Then just run Fracker locally with `./app/bin/fracker.js`.

Optionally, install the executable globally by creating a symlink to this folder with:

```console
npm install -g ./app/
```

Now you can just run `fracker`.

Uninstall with:

```console
rm -fr ./app/node_modules/
npm uninstall -g fracker
```

### Usage and configuration

Run `fracker --help` to obtain the full usage.

For convenience some [configuration files](app/configs/) listing some classes of *interesting* PHP functions are provided along with this repository. Use them like:

```console
fracker ./app/configs/file-* # ...
```

## License

This product includes Xdebug, freely available from <https://xdebug.org/>. Unless explicitly stated otherwise, for the PHP extension itself, the copyright is retained by the original authors.

The listener application instead is released under a [different](app/LICENSE) license.
