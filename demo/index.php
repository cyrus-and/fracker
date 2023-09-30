<?php

function foo($cmd) {
    system('echo ' . preg_replace('/[^a-z]/i', '', $cmd));
}

$a = explode(' ', $_GET['x']);

var_dump($a);

foreach ($a as $cmd) {
    foo($cmd);
}
