# Test suite

## Run inside a Docker container

```console
make docker-build
make docker-test
make docker-clean
```

## Run locally

```console
make build
make test
make clean
```

### Run single tests

This is mostly useful for debugging and test-writing purposes to avoid running the whole test suite every time. For example to run just the `argument-matching` test case:

```console
make build
./run.sh argument-matching
make clean
```
