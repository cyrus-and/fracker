const Formatter = require('./formatter.js');
const Matcher = require('./matcher.js');
const Stringifier = require('./stringifier.js');
const Walker = require('./walker.js');

function run(server, options = {}) {
    // create regexp sets from options (argumentsRegexp must be per-request due to tracking)
    const {ignoreCase} = options;
    const functionsRegexp = new Matcher(options.functions, ignoreCase);
    const excludeFunctionsRegexp = new Matcher(options.excludeFunctions, ignoreCase);
    const excludeArgumentsRegexp = new Matcher(options.excludeArguments, ignoreCase);
    const pathsRegexp = new Matcher(options.paths, ignoreCase);
    const excludePathsRegexp = new Matcher(options.excludePaths, ignoreCase);
    const muteFunctionsRegexp = new Matcher(options.muteFunctions, ignoreCase);
    const muteArgumentsRegexp = new Matcher(options.muteArguments, ignoreCase);
    const userInputsRegexp = new Matcher(options.userInputs, ignoreCase);
    const excludeUserInputsRegexp = new Matcher(options.excludeUserInputs, ignoreCase);

    // facility used to extract single values from composite objects
    const walker = new Walker(options, userInputsRegexp, excludeUserInputsRegexp);

    server.on('request', (request, events) => {
        // argumentsRegexp must be per-request due to tracking
        const argumentsRegexp = new Matcher(options.arguments, ignoreCase);

        // state variables and facilities
        const formatter = new Formatter(request, options, muteFunctionsRegexp, muteArgumentsRegexp);
        const stringifier = new Stringifier(argumentsRegexp, excludeArgumentsRegexp);
        const matchedCalls = new Set();
        const stackTrace = [];
        let lastMatchedLevel;
        let inMatchedFunction;

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
            // just show request info
            if (options.disableCallLog) {
                return;
            }

            // add the current call to the stack trace
            stackTrace.push(call);

            // skip when tracking and there are no arguments to match
            if (options.trackUserInputs && argumentsRegexp.isEmpty()) {
                return;
            }

            // skip if the script file path doesn't match
            if (!Matcher.match(`${call.file}:${call.line}`, pathsRegexp, excludePathsRegexp)) {
                return;
            }

            // children or siblings of matched calls
            if (options.showChildren && lastMatchedLevel < call.level ||
                options.showSiblings && lastMatchedLevel === call.level) {
                // avoid matching of too deep children (true when omitted)
                const children = typeof options.showChildren === 'boolean' ? Infinity : options.showChildren;
                if (options.showChildren && call.level - lastMatchedLevel > children) {
                    return;
                }

                // avoid matching children of siblings
                if (options.showSiblings && lastMatchedLevel < call.level) {
                    return;
                }

                // skip excluded functions anyway
                if (Matcher.exclude(call.function, excludeFunctionsRegexp)) {
                    return;
                }

                // print the auto tracked call
                const inMatchedFunction = lastMatchedLevel < call.level;
                const type = inMatchedFunction ? 'C' : 'S';
                formatter.formatCall(call, type);
            }
            // matched calls
            else {
                // avoid matching siblings of children
                if (options.showSiblings && lastMatchedLevel < call.level) {
                    return;
                }

                // reset the index used to remember auto tracked calls
                lastMatchedLevel = undefined;

                // skip if the function name doesn't match
                if (!Matcher.match(call.function, functionsRegexp, excludeFunctionsRegexp)) {
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

                // print the whole stack trace if requested
                if (options.showParents) {
                    // skip excluded functions anyway
                    if (Matcher.exclude(call.function, excludeFunctionsRegexp)) {
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

        events.on('exit', (exit) => {
            // just show request info
            if (options.disableCallLog) {
                return;
            }

            // print the elapsed time
            const isFunctionTracked = matchedCalls.has(exit.id);
            if (options.showElapsedTime && isFunctionTracked) {
                const call = stackTrace.slice(-1)[0];
                formatter.formatExit(exit, call);
            }

            // pop the current call from the stack trace
            stackTrace.pop();
        });

        // XXX the return event is only generated when a value is actually returned
        events.on('return', (return_) => {
            // just show request info
            if (options.disableCallLog) {
                return;
            }

            // add the return value to the set of tracking inputs and update the argument regexp
            if (options.trackUserInputs && options.recursive) {
                // add return values literally
                argumentsRegexp.add([...walker.walk(return_.return.value)], true);
            }

            // also print the return value
            const isFunctionTracked = matchedCalls.has(return_.id);
            if (options.showReturnValues && isFunctionTracked) {
                formatter.formatReturn(return_);
            }
        });

        events.on('warning', (warning) => {
            formatter.formatWarning(warning);
        });
    });
}

module.exports = {run};
