<?php

function fibo($n) {
    if ($n < 2) {
        return 1;
    } else {
        return fibo($n - 1) + fibo($n - 2);
    }
}

print fibo(5) . "\n";
