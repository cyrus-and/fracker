# Test suite

## Run inside a Docker container

```console
$ make rebuild-docker
$ make test-docker
$ make clean-docker
```

## Run locally

```console
$ make rebuild
$ make test
$ make clean
```

### Run single tests

This is mostly useful for debugging and test-writing purposes to avoid running the whole test suite every time:

```console
$ make rebuild
$ ./run.sh $test_case
$ make clean
```
