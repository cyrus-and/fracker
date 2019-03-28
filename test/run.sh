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

    # normalize the paths
    sed -i "s@$PWD@@" "$result"

    # check the result
    diff "$result" "$check"
    local status=$?

    # create the check file from result if missing
    if ! [ -f "$check" ]; then
        cp "$result" "$check"
        echo "Automatically creating $(readlink -f "$check")"
    fi

    return "$status"
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
