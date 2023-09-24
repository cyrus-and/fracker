#!/bin/bash

PHP_PORT=8080
FRACKER_PORT=6666

start-server() {
    echo "# Starting PHP server"
    exec php &>/dev/null \
        --no-php-ini \
        --define "zend_extension=$PWD/../ext/xdebug/modules/xdebug.so" \
        --server "127.0.0.1:$PHP_PORT" \
        --docroot ./php/
}

run-test() {
    local case="$1"
    local color="$2"
    local config="./cases/$case/config.yml"
    local script="./cases/$case/script.sh"
    local expected="./cases/$case/expected$color"
    local result="./cases/$case/result$color"

    echo "# Testing $case $color"

    # start fracker and wait for it to be fully up
    ../app/bin/fracker.js --port "$FRACKER_PORT" "$color" "$config" >"$result" 2>/dev/null & fracker_pid=$!
    while ! lsof -iTCP:"$FRACKER_PORT" -sTCP:LISTEN &>/dev/null; do
        sleep 0.1
    done

    # run test logic
    (
        local url="http://localhost:$PHP_PORT"
        source "$script"
    ) &>/dev/null

    # wait for completion
    kill "$fracker_pid"
    wait "$fracker_pid"

    # normalize the paths
    perl -i -pe "s@$PWD@@g" "$result"

    # normalize the elapsed time
    perl -i -pe 's/[[:digit:]]+\.[[:digit:]]+[num]?s/X/g' "$result"

    # create the expected file from result if missing
    if [[ ! -f "$expected" ]]; then
        cp "$result" "$expected"
        echo "# ... automatically creating $expected"
    fi

    # check the result
    git --no-pager diff --no-index "$expected" "$result"
}

run-suite() {
    # start the PHP server
    start-server &
    trap "kill $!" EXIT

    # wait for the server to come up
    while ! curl --silent --fail --output /dev/null "http://127.0.0.1:$PHP_PORT"; do
        sleep 0.1
    done

    # run each individual test
    let failed=0
    for case in "${cases[@]}"; do
        run-test "$case" '--color' || ((failed++))
        run-test "$case" '--no-color' || ((failed++))
    done

    # print outcome
    if [[ "$failed" -gt 0 ]]; then
        echo "# Test failed"
    else
        echo "# Test successful"
    fi
}

main() {
    local cases=(${@:-$( cd ./cases/ && echo * )})
    run-suite "$cases"
}

main "$@"
