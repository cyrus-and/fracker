const Formatter = require('./formatter.js');
const RegExpSet = require('./reg-exp-set.js');
const Stringifier = require('./stringifier.js');
const Walker = require('./walker.js');
const term = require('./term.js');

function run(server, options = {}) {
    // create regexp sets from options (argumentsRegexp must be per-request due to tracking)
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
    const walker = new Walker(options, userInputsRegexp, excludeUserInputsRegexp);

    server.on('request', (request, events) => {
        // argumentsRegexp must be per-request due to tracking
        const argumentsRegexp = new RegExpSet(options.arguments, options.ignoreCase);

        // state variables and facilities
        const formatter = new Formatter(request, options, muteFunctionsRegexp, muteArgumentsRegexp);
        const stringifier = new Stringifier(argumentsRegexp, excludeArgumentsRegexp);
        const matchedCalls = new Set();
        const stackTrace = [];
        let lastMatchedLevel;
        let inMatchedFunction;

        // print the request line
        formatter.formatRequest();

        // prepare the initial tracking regexps
        if (options.trackUserInputs) {
            // add inputs according to the PHP invocation
            const inputs = [];
            const isWebRequest = !!request.server.REQUEST_METHOD;
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
                formatter.formatCall(call, type);
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
                    const result = stringifier.stringify(argument.value);

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
                        formatter.formatCall(call, 'P');
                    });
                }

                // print the actual call
                formatter.formatCall(call, 'M');
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
                formatter.formatReturn(return_);
            }
        });

        events.on('warning', (warning) => {
            term.err(warning.message, request.id);
        });
    });
}

module.exports = {run};
