<?php

function transform1($x) {
    return strtolower($x);
}

function transform2($x) {
    return preg_replace('/[^a-z0-9]/i', '', $x);
}

function transform3($x) {
    return "'$x'";
}

function process($x) {
    var_dump($x);
}

function do_actual_stuff($x) {
    process(transform3(transform2(transform1($x))));
}

if (isset($_GET['GET_key'])) {
    var_dump('GET_key');
    var_dump('get_key');
    do_actual_stuff($_GET['GET_key']);
}

if (isset($_POST['POST_key'])) {
    var_dump('POST_key');
    var_dump('post_key');
    do_actual_stuff($_POST['POST_key']);
}

if (isset($_COOKIE['COOKIE_key'])) {
    var_dump('COOKIE_key');
    var_dump('cookie_key');
    do_actual_stuff($_COOKIE['COOKIE_key']);
}

if (isset($_SERVER['HTTP_HEADER_KEY'])) {
    var_dump('HTTP_HEADER_KEY');
    var_dump('http_header_key');
    do_actual_stuff($_SERVER['HTTP_HEADER_KEY']);
}

function dummy($x) {
    return 123;
}

$x = dummy($_SERVER['PHP_SELF']);
var_dump("$x");
