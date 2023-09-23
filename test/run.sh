#!/bin/bash

root="$(readlink -f ..)"

run-single-test() {
    # gather test files
    local base="$1"
    local color="$2"
    local script="$base/script.sh"
    local config="$base/config.yml"
    local check="$base/check$color"
    local result="$base/result$color"

    # start fracker and wait for it to be fully up
    "$root/app/bin/fracker.js" "$config" "$color" >"$result" 2>/dev/null & fracker_pid=$!
    while [ -z "$(ss -ltH 'sport = 6666')" ]; do
        sleep 0.1
    done

    # run test logic
    local url="http://localhost:8080"
    local php="$root/test/php"
    source "$script" &>/dev/null

    # wait for completion
    kill "$fracker_pid"
    wait -n

    # normalize the paths
    sed -i "s@$(pwd -P)@@g" "$result"

    # normalize the elapsed time
    sed -i 's/[[:digit:]]\+\.[[:digit:]]\+[num]\?s/X/g' "$result"

    # check the result
    diff --color=always -u "$check" "$result" 2>/dev/null
    local status=$?

    # create the check file from result if missing
    if ! [ -f "$check" ]; then
        cp "$result" "$check"
        echo "Automatically creating $(readlink -f "$check")"
    fi

    return "$status"
}

run-test() {
    local config="$1"
    local base="$(dirname "$config")"
    local name="$(basename "$base")"

    echo "# Testing '$name' (ANSI)"
    if ! run-single-test "$base" '--color'; then
        let failed++
    fi

    echo "# Testing '$name' (plain)"
    if ! run-single-test "$base" '--no-color'; then
        let failed++
    fi
}

run-suite() {
    # start the PHP server
    start-server & server_pid=$!

    # run each individual test
    let failed=0
    for config in cases/*/*.yml; do
        run-test "$config"
    done

    # clean up
    kill "$server_pid"
    if [ "$failed" -gt 0 ]; then
        echo -e "\n\n# FAILED\n\n"
        false
    fi
}

start-server() {
    trap 'kill "$server_pid" &>/dev/null' TERM
    echo "# Starting PHP server..."
    php -n -d "zend_extension=$root/ext/xdebug/modules/xdebug.so" -S localhost:8080 -t php &>/dev/null & server_pid=$!
    wait
}

case "$1" in
    '-d')
        start-server
        ;;
    '')
        trap 'kill "$server_pid" "$fracker_pid" &>/dev/null; exit' INT
        run-suite
        ;;
    *)
        run-test "$1"
        ;;
esac
