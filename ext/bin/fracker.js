#!/usr/bin/env node

const analyzer = require('../lib/analyzer.js');
const packageInfo = require('../package.json');
const Server = require('../lib/server.js');

const program = require('commander');
const yaml = require('js-yaml');

const fs = require('fs');

function append(value, array) {
    array.push(value);
    return array;
}

program
    .usage('[options] | <config.yml>')
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
<config.yml> is a YAML file containing command line long options in camel case, for example:

  callLocations: true
  shallow: true
  functions:
    - foo
    - bar
  arguments:
    - "x y"
`);
});

// parse and validate arguments
let options = program.parse(process.argv);
if (program.args.length > 1) {
    program.outputHelp();
    process.exit(1);
} else if (program.args.length === 1) {
    options = yaml.safeLoad(fs.readFileSync(program.args[0], 'utf-8'));
}

// start!
const server = new Server(options);
analyzer.run(server, options);
