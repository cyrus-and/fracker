<?php

eval('
function foo($x) {
    return $x;
}

var_dump(foo("test"));
');
