#!/bin/bash

root="$(readlink -f ..)"

run-test() {
    # gather test files
    local base="$1"
    local color="$2"
    local script="$base/script.sh"
    local config="$base/config.yml"
    local check="$base/check$color"
    local result="$base/.result$color"

    # start fracker and wait for it to be fully up
    "$root/app/bin/fracker.js" "$config" "$color" &>"$result" & fracker_pid=$!
    while [ -z "$(ss -ltH 'sport = 6666')" ]; do
        sleep 0.1
    done

    # run test logic
    local url="http://localhost:8080/"
    local php="$root/test/php"
    source "$script" &>/dev/null

    # wait for completion
    kill "$fracker_pid"
    wait -n

    # normalize the paths
    sed -i "s@$(pwd -P)@@g" "$result"

    # check the result
    diff "$result" "$check" 2>/dev/null
    local status=$?

    # create the check file from result if missing
    if ! [ -f "$check" ]; then
        cp "$result" "$check"
        echo "Automatically creating $(readlink -f "$check")"
    fi

    return "$status"
}

run-suite() {
    # start the PHP server
    php -d "zend_extension=$root/ext/.libs/xdebug.so" -S localhost:8080 -t php &>/dev/null & server_pid=$!

    # run each individual test
    let failed=0
    for config in cases/*/*.yml; do
        base="$(dirname "$config")"
        name="$(basename "$base")"

        echo "# Testing '$name' (ANSI)"
        if ! run-test "$base" '--color'; then
            let failed++
        fi

        echo "# Testing '$name' (plain)"
        if ! run-test "$base" '--no-color'; then
            let failed++
        fi
    done

    # clean up
    kill "$server_pid"
    if [ "$failed" -gt 0 ]; then
        echo -e "\n\n# FAILED\n\n"
        false
    fi
}

run-suite
