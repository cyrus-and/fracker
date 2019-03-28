#!/bin/bash

FRACKER_ROOT="$(readlink -f ..)"

run-test() {
    # gather test files
    local name="$1"
    local script="$name.php"
    local config="$name.yml"
    local check="$name.chk"
    local result="$name.out"

    # start fracker and wait for it to be fully up
    "$FRACKER_ROOT/app/bin/fracker.js" "$config" &>"$result" & fracker_pid=$!
    while [ -z "$(ss -ltH 'sport = 6666')" ]; do
        sleep 0.1
    done

    # run PHP code and wait for completion
    curl "http://localhost:8080/$script" &>/dev/null
    kill "$fracker_pid"
    wait -n

    # create an empty check file if missing so to show the content
    touch "$check"

    # check the result
    diff "$result" "$check"
}

run-suite() {
    cd cases

    # start PHP server
    php -d "zend_extension=$FRACKER_ROOT/ext/.libs/xdebug.so" -S localhost:8080 &>/dev/null & server_pid=$!

    # run each individual test
    let failed=0
    for config in *.yml; do
        name="$(basename -s '.yml' "$config")"

        echo "# Running test case '$name'"
        if ! run-test "$name"; then
            let failed++
        fi
    done

    # clean up
    kill "$server_pid"
    [ "$failed" -eq 0 ]
}

run-suite
