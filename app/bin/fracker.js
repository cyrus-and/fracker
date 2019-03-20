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

// merge into base others with decreasing priority
function mergeConfig(base, others) {
    others.forEach((object) => {
        Object.entries(object).forEach(([key, value]) => {
            // append elements to arrays and set only if not already set
            if (base[key] === undefined) {
                base[key] = value;
            } else if (Array.isArray(base[key])) {
                base[key].push(...value);
            }
        });
    });
}

program
    .usage('[options] [<config.yml>...]')
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
    .option('-t, --track-user-inputs', 'automatically track user-controlled arguments')
    .option('-r, --recursive', 'propagate user-controlled arguments through return values')
    .option('-u, --user-inputs <regexp>', 'use user-controlled arguments matching <regexp>', append, [])
    .option('-U, --exclude-user-inputs <regexp>', 'ignore user-controlled arguments matching <regexp>', append, [])
    .option('-X, --exclude-non-string', 'only consider string values as user-controlled arguments')
    .option('-H, --exclude-headers', 'exclude headers from user-controlled arguments')
    .option('-o, --values-only', 'do not consider array names as user-controlled input initially')
    .option('-s, --shallow', 'use no indentation to show the call depth')
    .option('-v, --return-values', 'show return values')
    .option('-k, --stack-traces', 'show stack traces for each matched function')
    .option('-c, --children', 'show children calls for the first matched functions')
    .option('-b, --siblings', 'show siblings calls for the first matched functions')
    .option('-L, --hide-call-locations', 'hide file and line where the function is called');

// used by chalk to manage ANSI output
program
    .option('--color', 'enable ANSI-colored output even if not TTY')
    .option('--no-color', 'disable ANSI-colored output even if TTY');

// common options (help and version are automatically added)
program
    .version(packageInfo.version, '--version');

program.on('--help', function () {
    console.log(`
<config.yml> is a YAML file containing long command line options in camel case,
for example:

  hideCallLocations: true
  shallow: true
  functions:
    - foo
    - bar
  arguments:
    - "x y"

Multiple files with increasing priority can be specified, but command line
options will have the highest priority.

Options that control the ANSI output cannot appear in YAML files.`);
});

// parse arguments and build the configuration
const options = program.parse(process.argv);
const configs = program.args.map((path) => {
    return yaml.safeLoad(fs.readFileSync(path, 'utf-8'));
}).reverse();
mergeConfig(options, configs);

// start!
const server = new Server(options);
analyzer.run(server, options);
