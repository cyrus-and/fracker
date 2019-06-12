const Matcher = require('./matcher.js');
const color = require('./color.js');
const term = require('./term.js');

function indent(level, shallow) {
    return color.shadow(shallow ? '' : '»  '.repeat(level - 1));
}

class Formatter {
    constructor(request, options, muteFunctionsRegexp, muteArgumentsRegexp) {
        this._request = request;
        this._options = options;
        this._muteFunctionsRegexp = muteFunctionsRegexp;
        this._muteArgumentsRegexp = muteArgumentsRegexp;
        this._headerFormatted = false;

        // format the marker according to the default width
        this._formattedId = String(this._request.id).padStart(term.DEFAULT_MARKER_WIDTH, '0');

        // format the header anyway if requested
        if (options.showEmptyRequests || options.disableCallLog) {
            this._formatHeaderIfNeeded();
        }
    }

    formatCall(call, type) {
        this._formatHeaderIfNeeded();

        // format arguments
        let argumentList;
        if (Matcher.exclude(call.function, this._muteFunctionsRegexp)) {
            argumentList = color.shadow('...');
        } else {
            argumentList = call.arguments.map(({name, value, stringValue}) => {
                // omit muted arguments
                if (name && Matcher.exclude(name, this._muteArgumentsRegexp)) {
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
        const indentation = indent(call.level, this._options.shallow);
        const functionName = (type === 'M' ? color.function : color.context)(call.function);
        const fileInfo = this._options.hideCallLocations ? '' : ` ${color.shadow(`${call.file} +${call.line}`)}`;
        const callId = type === 'M' && this._options.shallow && this._options.showReturnValues ? `${color.shadow(call.id)} ` : '';
        const marker = (!color.isEnabled || this._options.shallow) && !this._options.showReturnValues && type !== 'M' && (this._options.showParents || this._options.showChildren || this._options.showSiblings) ? `${color.shadow(type)} ` : '';
        term.out(color.reset(`${indentation}${callId}${marker}${functionName}${argumentList}${fileInfo}`), this._formattedId);
    }

    formatReturn(return_) {
        // format return and print
        const indentation = indent(return_.level, this._options.shallow);
        const json_value = JSON.stringify(return_.return.value);
        const callId = this._options.shallow ? `${color.shadow(return_.id)} ` : '';
        term.out(color.reset(`${indentation}${callId}${color.function('=')} ${json_value}`), this._formattedId);
    }

    formatWarning(warning) {
        this._formatHeaderIfNeeded();
        term.err(warning.message, this._formattedId);
    }

    _formatHeaderIfNeeded() {
        // format the header just once
        if (this._headerFormatted) {
            return;
        } else {
            this._headerFormatted = true;
        }

        // format the request header
        term.log();
        const isWebRequest = !!this._request.server.REQUEST_METHOD;
        if (isWebRequest) {
            const method = color.method(this._request.server.REQUEST_METHOD);
            const url = color.invocation(`${this._request.server.HTTP_HOST}${this._request.server.REQUEST_URI}`);
            term.out(`${method} ${url}`, this._formattedId);
        } else {
            const argv = JSON.stringify(this._request.server.argv);
            term.out(`${color.method('PHP')} ${color.invocation(argv)}`, this._formattedId);
        }

        // format the server variables
        if (this._options.showServerVariable) {
            if (this._options.showServerVariable.indexOf('q') !== -1) {
                this._formatServerVariables('query', this._request.get);
            }
            if (this._options.showServerVariable.indexOf('b') !== -1) {
                this._formatServerVariables('body', this._request.post);
            }
            if (this._options.showServerVariable.indexOf('c') !== -1) {
                this._formatServerVariables('cookie', this._request.cookie);
            }
            if (this._options.showServerVariable.indexOf('s') !== -1) {
                this._formatServerVariables('server', this._request.server);
            }
            if (this._options.showServerVariable.indexOf('i') !== -1 && this._request.input) {
                term.out(color.shadow(`input:`), this._formattedId);
                term.out(color.reset(JSON.stringify(this._request.input)), this._formattedId);
            }
        }
    }

    _formatServerVariables(label, object) {
        if (Object.keys(object).length === 0) {
            return;
        }
        term.out(color.shadow(`${label}:`), this._formattedId);
        for (const key in object) {
            const value = object[key];
            term.out(color.reset(`${color.argument(`${key}=`)}${JSON.stringify(value)}`), this._formattedId);
        }
    }
}

module.exports = Formatter;
