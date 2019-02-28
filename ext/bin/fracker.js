#!/usr/bin/env node

const packageInfo = require('../package.json');
const Server = require('../lib/server.js');
const terminal = require('../lib/terminal.js');

const program = require('commander');

function append(value, array) {
    array.push(value);
    return array;
}

program
    .option('--host <host>', 'bind the server to address <host>')
    .option('--port <port>', 'bind the server to port <port>')
    .option('-f, --functions <regexp>', 'show functions whose name matches <regexp>', append, [])
    .option('-F, --exclude-functions <regexp>', 'hide functions whose name matches <regexp>', append, [])
    .option('-a, --arguments <regexp>', 'show  functions with arguments matching <regexp>', append, [])
    .option('-A, --exclude-arguments <regexp>', 'hide functions with arguments matching <regexp>', append, [])
    .option('-p, --paths <regexp>', 'show functions called in files matching <regexp>', append, [])
    .option('-P, --exclude-paths <regexp>', 'hide functions called in files matching <regexp>', append, [])
    .option('--mute-functions <regexp>', 'do not print values for arguments of functions whose name matches <regexp>', append, [])
    .option('--mute-arguments <regexp>', 'do not print values for arguments whose name matches <regexp>', append, [])
    .option('-i, --ignore-case', 'ignore case in matches')
    .option('-t, --taint', 'automatically match user-controlled arguments')
    .option('-r, --recursive', 'propagate user-controlled arguments through return values')
    .option('-u, --user-inputs <regexp>', 'use user-controlled arguments matching <regexp>', append, [])
    .option('-U, --exclude-user-inputs <regexp>', 'ignore user-controlled arguments matching <regexp>', append, [])
    .option('-x, --exclude-non-string', 'only consider string values as user-controlled arguments')
    .option('-o, --values-only', 'do not consider array names as user-controlled input initially')
    .option('-s, --shallow', 'use no indentation to show the call depth')
    .option('-v, --return-values', 'show return values')
    .option('-k, --stack-traces', 'show stack traces for each matched function')
    .option('-c, --children', 'show children calls for the first matched functions')
    .option('-l, --call-locations', 'show file and line where the function is called');

// used by chalk to manage ANSI output
program
    .option('--color', 'enable ANSI-colored output even if not TTY')
    .option('--no-color', 'disable ANSI-colored output even if TTY');

// common options (help and version are automatically added)
program
    .version(packageInfo.version, '--version');

program.on('--help', function () {
    console.log(`
<regexp> can be in the form "@<path>", in that case regexps are read from file, one per line. "@@" resolves to a literal "@".

The regexps about arguments match the JSON representation of the value.
`);
});

program.parse(process.argv);
const server = new Server(program);
terminal.run(server, program);
