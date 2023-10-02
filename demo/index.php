<?php

function calculate($expression) {
    try {
        return eval("return $expression;");
    } catch (ParseError $error) {
        return 'ERROR';
    }
}

function is_safe($expression) {
    return preg_match('/^[0-9+.\-*\/() ]+/', $expression);
}

@ $expression = $_GET['expression'];
if (!empty($expression) && is_safe($expression)) {
    $result = calculate($expression);
    echo "The result is: $result\n";
} else {
    http_response_code(400);
}
