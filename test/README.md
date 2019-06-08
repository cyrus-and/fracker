# Test suite

## Run inside a Docker container

```console
$ make rebuild-docker
$ make test-docker
```

## Run locally

Make sure to install the PHP development files.

```console
$ make rebuild
$ make test
```

## Run single tests

This is mostly useful for debugging and test-writing purposes to avoid running the whole test suite every time:

1. start the server:

    ```console
    $ ./run.sh -d
    ```

2. run the test:

    ```console
    $ ./run.sh cases/$the_test_case/config.yml
    ```
