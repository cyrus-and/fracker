const ObjectWalker = require('./object-walker.js');
const RegExpSet = require('./reg-exp-set.js');

const chalk = require('chalk');

const color = {
    shadow: chalk.gray,
    function: chalk.green,
    argument: chalk.cyan,
    highlight: chalk.red,
    context: chalk.blue,
    error: chalk.red,
    method: chalk.white.bold,
    invocation: chalk.yellow
};

function handleServerShutdown(server) {
    let flag = false;

    function handler() {
        if (flag) {
            console.error(color.shadow(`+ │ Forced shutdown`));
            process.exit();
        } else {
            flag = true;
            console.error(color.shadow(`+ │ Shuting down...`));
            server.close();
        }
    }

    process.on('SIGINT', handler);
    process.on('SIGTERM', handler);
}

function indent(level, shallow) {
    return color.shadow(shallow ? '' : '»  '.repeat(level - 1));
}

function run(server, options = {}) {
    // create regexp sets from options (argumentsRegexp must be per-request dut to tracking)
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
    const walker = new ObjectWalker(userInputsRegexp, excludeUserInputsRegexp, options.valuesOnly, options.excludeNonString);

    // allow graceful shutdown of the server
    handleServerShutdown(server);

    server.on('listening', (host, port) => {
        console.error(color.shadow(`+ │ Listening on ${host}:${port}`));
    });

    server.on('error', (err) => {
        console.error(color.error(`! │ ${err.stack}`));
    });

    server.on('request', (request, events) => {
        function renderCall(call, type) {
            // format arguments
            let argumentList;
            if (RegExpSet.exclude(call.function, muteFunctionsRegexp)) {
                argumentList = color.shadow('...');
            } else {
                argumentList = call.arguments.map(({name, value, stringValue}) => {
                    // omit muted arguments
                    if (name && RegExpSet.exclude(name, muteArgumentsRegexp)) {
                        value = color.shadow('...');
                    } else {
                        // stringify values for auto tracked calls
                        value = type === 'M' ? stringValue : JSON.stringify(value);
                    }

                    // format argument
                    return name ? `${color.argument(`${name}=`)}${value}` : value;
                }).join(color.shadow(', '));
            }
            argumentList = `${color.shadow('(')}${argumentList}${color.shadow(')')}`;

            // format call and print
            const prefix = color.shadow(`${request.id} │`);
            const indentation = indent(call.level, options.shallow);
            const functionName = (type === 'M' ? color.function : color.context)(call.function);
            const fileInfo = options.hideCallLocations ? '' : ` ${color.shadow(`${call.file} +${call.line}`)}`;
            const callId = type === 'M' && options.shallow && options.returnValues ? `${color.shadow(call.id)} ` : '';
            const marker = (!chalk.enabled || options.shallow) && !options.returnValues && type !== 'M' && (options.parents || options.children || options.siblings) ? `${color.shadow(type)} ` : '';
            console.log(`${prefix} ${indentation}${callId}${marker}${functionName}${argumentList}${fileInfo}`);
        }

        function stringifyObject(object) {
            let matched = false;
            let string = '';
            if (typeof(object) === 'object' && object !== null) {
                if (Array.isArray(object)) {
                    string += '[';
                    object.forEach((element, i) => {
                        // separator
                        if (i !== 0) {
                            string += ', ';
                        }

                        // stringify the element
                        const result = stringifyObject(element);
                        if (!result) {
                            return;
                        }
                        string += result.string;
                        matched = matched || result.matched;
                    });
                    string += ']';
                } else {
                    string += '{';
                    Object.keys(object).forEach((key, i) => {
                        let result;

                        // separator
                        if (i !== 0) {
                            string += ', ';
                        }

                        // stringify the key
                        result = stringifyObject(key);
                        if (!result) {
                            return;
                        }
                        string += result.string;
                        matched = matched || result.matched;

                        // separator
                        string += ': ';

                        // stringify the value
                        result = stringifyObject(object[key]);
                        if (!result) {
                            return;
                        }
                        string += result.string;
                        matched = matched || result.matched;
                    });
                    string += '}';
                }
            } else {
                // non-string objects are just converted, strings are matched and highlighted
                if (typeof(object) !== 'string') {
                    string += String(object);
                } else {
                    // match against exclusions
                    if (RegExpSet.exclude(object, excludeArgumentsRegexp)) {
                        return null;
                    } else {
                        const components = [];
                        let index = 0;
                        let match;

                        // loop over the matches
                        const regexp = argumentsRegexp.get();
                        while (!argumentsRegexp.isEmpty() && (match = regexp.exec(object)) !== null) {
                            // add the span before the match
                            components.push(JSON.stringify(object.slice(index, match.index)).slice(1, -1));

                            // move the index after the match
                            index = regexp.lastIndex;

                            // add the match itself
                            components.push(color.highlight(JSON.stringify(object.slice(match.index, index)).slice(1, -1)));

                            // avoid an infinite loop for zero-sized matches
                            if (regexp.lastIndex === match.index) {
                                regexp.lastIndex++;
                            }
                        }

                        // add the remaining part
                        components.push(JSON.stringify(object.slice(index, object.length)).slice(1, -1));

                        // update status
                        matched = (components.length > 1);
                        string += `"${components.join('')}"`;
                    }
                }
            }
            return {matched, string};
        }

        const isWebRequest = !!request.server.REQUEST_METHOD;
        const matchedCalls = new Set();
        const argumentsRegexp = new RegExpSet(options.arguments, options.ignoreCase); // per-request
        const stackTrace = [];
        let lastMatchedLevel;
        let inMatchedFunction;

        // print the request line
        const prefix = color.shadow(`\n${request.id} │`);
        if (isWebRequest) {
            const method = color.method(request.server.REQUEST_METHOD);
            const url = color.invocation(`${request.server.HTTP_HOST}${request.server.REQUEST_URI}`);
            console.log(`${prefix} ${method} ${url}`);
        } else {
            const argv = JSON.stringify(request.server.argv);
            const invocation = `${color.method('PHP')} ${color.invocation(argv)}`;
            console.log(`${prefix} ${invocation}`);
        }

        // prepare the initial tracking regexps
        if (options.trackUserInputs) {
            // add inputs according to the PHP invocation
            const inputs = [];
            if (isWebRequest) {
                // add common superglobals
                inputs.push(request.get, request.post);

                // also add headers if requested
                if (!options.excludeHeaders) {
                    // add parsed cookie values
                    inputs.push(request.cookie);

                    // add headers (cookie included as a whole string)
                    for (const variable in request.server) {
                        if (variable.startsWith('HTTP_')) {
                            inputs.push(request.server[variable]);
                        }
                    }
                }
            } else {
                // add whole server superglobal (environment plus argv)
                inputs.push(request.server);
            }

            // add tracking inputs literally
            argumentsRegexp.add([...walker.walk(inputs)], true);
        }

        events.on('call', (call) => {
            // collect the stack trace if requested
            if (options.parents) {
                // skip deeper calls
                for (let i = stackTrace.length - 1; i >= 0; i--) {
                    if (stackTrace[i].level < call.level) {
                        stackTrace.splice(i + 1);
                        break;
                    }
                }

                // add the current call to the stack trace
                if (options.parents) {
                    stackTrace.push(call);
                }
            }

            // skip when tracking and there are no arguments to match
            if (options.trackUserInputs && argumentsRegexp.isEmpty()) {
                return;
            }

            // skip if the script file path doesn't match
            if (!RegExpSet.match(call.file, pathsRegexp, excludePathsRegexp)) {
                return;
            }

            // children of matched calls
            if (options.children && lastMatchedLevel < call.level ||
                options.siblings && lastMatchedLevel === call.level) {
                // avoid matching of too deep children (true when omitted)
                const children = typeof options.children === 'boolean' ? Infinity : options.children;
                if (options.children && call.level - lastMatchedLevel > children) {
                    return;
                }

                // avoid matching children of siblings
                if (options.siblings && lastMatchedLevel < call.level && !inMatchedFunction) {
                    return;
                }

                // skip excluded functions anyway
                if (RegExpSet.exclude(call.function, excludeFunctionsRegexp)) {
                    return;
                }

                // print the auto tracked call
                const type = inMatchedFunction ? 'C' : 'S';
                renderCall(call, type);
            }
            // matched calls
            else {
                // avoid matching siblings of children
                if (options.siblings && lastMatchedLevel < call.level) {
                    return;
                }

                // reset the index used to remember auto tracked calls
                lastMatchedLevel = undefined;

                // skip if the function name doesn't match
                if (!RegExpSet.match(call.function, functionsRegexp, excludeFunctionsRegexp)) {
                    return;
                }

                // process arguments
                let atLeastOneMatched = false;
                for (const argument of call.arguments) {
                    // stringify the argument
                    const result = stringifyObject(argument.value);

                    // abort the call if this argument is excluded by the regexp
                    if (!result) {
                        return;
                    }

                    // keep track of matching arguments
                    if (result.matched) {
                        atLeastOneMatched = true;
                    }

                    argument.stringValue = result.string;
                }

                // skip if no argument matches
                if (!argumentsRegexp.isEmpty() && !atLeastOneMatched) {
                    return;
                }

                // save the level of this matched call
                lastMatchedLevel = call.level;

                // at this point the function call is selected to be printed
                matchedCalls.add(call.id);
                inMatchedFunction = true;

                // print the whole stack trace if requested
                if (options.parents) {
                    // skip excluded functions anyway
                    if (RegExpSet.exclude(call.function, excludeFunctionsRegexp)) {
                        return;
                    }

                    stackTrace.slice(0, -1).forEach((call) => {
                        renderCall(call, 'P');
                    });
                }

                // print the actual call
                renderCall(call, 'M');
            }
        });

        events.on('return', (return_) => {
            const isFunctionTracked = matchedCalls.has(return_.id);

            // marks the end of a matched function
            if (isFunctionTracked) {
                inMatchedFunction = false;
            }

            // add the return value to the set of tracking inputs and update the argument regexp
            if (options.trackUserInputs && options.recursive) {
                // add return values literally
                argumentsRegexp.add([...walker.walk(return_.return.value)], true);
            }

            // also print the return value
            if (options.returnValues && isFunctionTracked) {
                const prefix = color.shadow(`${request.id} │`);
                const indentation = indent(return_.level, options.shallow);
                const json_value = JSON.stringify(return_.return.value);
                const callId = options.shallow ? `${color.shadow(return_.id)} ` : '';
                console.log(`${prefix} ${indentation}${callId}${color.function('=')} ${json_value}`);
            }
        });

        events.on('warning', (warning) => {
            const prefix = color.shadow(`${request.id} │`);
            console.error(`${prefix} ${color.error(warning.message)}`);
        });
    });
}

module.exports = {run};
