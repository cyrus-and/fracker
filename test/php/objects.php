<?php

class Foo {
    function __construct($x) {
        $this->x = $x;
    }

    function method1($y) {
        $this->method2($this->x, $y);
    }

    function method2($x, $y) {
        $this->method3($x);
        $this->method3($y);
    }

    function method3($x) {
        var_dump($x);
    }
}

$c = new Foo(123);
$c->method1('foo');
$c->method2('bar', 'baz');
$c->method3('qwerty');
