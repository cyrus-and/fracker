const ObjectWalker = require('./object-walker.js');
const RegExpSet = require('./reg-exp-set.js');

const chalk = require('chalk');

function run(server, options = {}) {
    // create regexp sets from options (argumentsRegexp must be per-request dut to taint)
    const functionsRegexp = new RegExpSet(options.functions, options.ignoreCase);
    const excludeFunctionsRegexp = new RegExpSet(options.excludeFunctions, options.ignoreCase);
    const excludeArgumentsRegexp = new RegExpSet(options.excludeArguments, options.ignoreCase);
    const pathsRegexp = new RegExpSet(options.paths, options.ignoreCase);
    const excludePathsRegexp = new RegExpSet(options.excludePaths, options.ignoreCase);
    const muteFunctionsRegexp = new RegExpSet(options.muteFunctions, options.ignoreCase);
    const muteArgumentsRegexp = new RegExpSet(options.muteArguments, options.ignoreCase);
    const userInputsRegexp = new RegExpSet(options.userInputs, options.ignoreCase);
    const excludeUserInputsRegexp = new RegExpSet(options.excludeUserInputs, options.ignoreCase);

    // facility used to extract single values from composite objects
    const walker = new ObjectWalker(userInputsRegexp, excludeUserInputsRegexp, options.valuesOnly);

    server.on('listening', (host, port) => {
        console.error(chalk.gray(`[+] Listening on ${host}:${port}`));
    });

    server.on('error', (err) => {
        console.error(chalk.red(`[!] ${err.stack}`));
    });

    server.on('request', (request, events) => {
        function renderCall(call, isStack = false) {
            // format arguments
            let argumentList;
            if (RegExpSet.exclude(call.function, muteFunctionsRegexp)) {
                argumentList = chalk.gray('...');
            } else {
                argumentList = call.arguments.map(({name, value, stringValue}) => {
                    // omit muted arguments
                    if (name && RegExpSet.exclude(name, muteArgumentsRegexp)) {
                        value = chalk.gray('...');
                    } else {
                        // stringify values if requested (ie, only for stack entries)
                        value = isStack ? JSON.stringify(value) : stringValue;
                    }

                    // format argument
                    return name ? `${chalk.cyan(`${name}=`)}${value}` : value;
                }).join(chalk.gray(', '));
            }
            argumentList = `${chalk.gray('(')}${argumentList}${chalk.gray(')')}`;

            // format call and print
            const prefix = chalk.gray(`${request.id} │`);
            const indentation = indent(call.level, options.shallow);
            const functionName = (isStack ? chalk.reset : chalk.green)(call.function);
            const fileInfo = options.functionLocations ? ` ${chalk.gray(`${call.file} +${call.line}`)}` : '';
            const callId = options.shallow && !isStack ? `${chalk.gray(call.id)} ` : '';
            console.log(`${prefix} ${indentation}${callId}${functionName}${argumentList}${fileInfo}`);
        }

        const isWebRequest = !!request.server.REQUEST_METHOD;
        const matchedCalls = new Set();
        const argumentsRegexp = new RegExpSet(options.arguments, options.ignoreCase); // per-request

        // print the request line
        const prefix = chalk.gray(`\n${request.id} ┌`);
        if (isWebRequest) {
            const method = chalk.white.bold(request.server.REQUEST_METHOD);
            const url = chalk.yellow(`${request.server.HTTP_HOST}${request.server.REQUEST_URI}`);
            console.log(`${prefix} ${method} ${url}`);
        } else {
            const argv = JSON.stringify(request.server.argv);
            const invocation = `${chalk.white.bold('$ php')} ${chalk.yellow(argv)}`;
            console.log(`${prefix} ${invocation}`);
        }

        // prepare the initial taint regexps
        if (options.taint) {
            // add inputs according to the PHP invocation
            const inputs = [];
            if (isWebRequest) {
                // add common superglobals
                inputs.push(request.get, request.post, request.cookie);

                // add headers (cookie included as a whole string)
                for (const variable in request.server) {
                    if (variable.startsWith('HTTP_')) {
                        inputs.push(request.server[variable]);
                    }
                }
            } else {
                // add whole server superglobal (environment plus argv)
                inputs.push(request.server);
            }

            // add taint inputs literally
            argumentsRegexp.add([...walker.walk(inputs)], true);
        }

        events.on('call', (call, stackTrace) => {
            // skip when taint mode and there are no arguments to match
            if (options.taint && argumentsRegexp.isEmpty()) {
                return;
            }

            // skip if the script file path doesn't match
            if (!RegExpSet.match(call.file, pathsRegexp, excludePathsRegexp)) {
                return;
            }

            // skip if the function name doesn't match
            if (!RegExpSet.match(call.function, functionsRegexp, excludeFunctionsRegexp)) {
                return;
            }

            // process arguments
            let atLeastOneMatched = false;
            for (const argument of call.arguments) {
                // XXX it is done all here to avoid matching the regexps twice

                // stringify, match and highlight arguments
                const json_value = JSON.stringify(argument.value);
                argument.stringValue = json_value.replace(argumentsRegexp, (match) => {
                    atLeastOneMatched = true;
                    return chalk.red(match);
                });

                // match against exclusions
                if (RegExpSet.exclude(json_value, excludeArgumentsRegexp)) {
                    return;
                }
            }

            // skip if no argument matches
            if (!argumentsRegexp.isEmpty() && !atLeastOneMatched) {
                return;
            }

            // at this point the function call is selected to be printed
            matchedCalls.add(call.id);

            // print the whole stack trace if requested
            if (options.stackTraces) {
                stackTrace.forEach((call) => {
                    renderCall(call, true);
                });
            }

            // print the actual call
            renderCall(call);
        });

        events.on('return', (return_) => {
            const isFunctionTracked = matchedCalls.has(return_.id);

            // add the return value to the set of taint inputs and update the argument regexp
            if (options.taint && options.recursive) {
                // add return values literally
                argumentsRegexp.add([...walker.walk(return_.return.value)], true);
            }

            // also print the return value
            if (options.returnValues && isFunctionTracked) {
                const prefix = chalk.gray(`${request.id} │`);
                const indentation = indent(return_.level, options.shallow);
                const json_value = JSON.stringify(return_.return.value);
                const callId = options.shallow ? `${chalk.gray(return_.id)} ` : '';
                console.log(`${prefix} ${indentation}${callId}${chalk.green('=')} ${json_value}`);
            }
        });

        events.on('warning', (message) => {
            const prefix = chalk.gray(`${request.id} │`);
            console.error(chalk.red(`${prefix} ${chalk.red(message)}`));
        });
    });
}

function indent(level, shallow) {
    return chalk.gray(shallow ? '' : '»  '.repeat(level - 1));
}

module.exports = {run};
