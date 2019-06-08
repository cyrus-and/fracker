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

        // format the header anyway if requested
        if (options.showEmptyRequests) {
            this._formatHeaderIfNeeded();
        }
    }

    _formatHeaderIfNeeded() {
        // format the header just once
        if (this._headerFormatted) {
            return;
        } else {
            this._headerFormatted = true;
        }

        // format the request header
        const isWebRequest = !!this._request.server.REQUEST_METHOD;
        term.log();
        if (isWebRequest) {
            const method = color.method(this._request.server.REQUEST_METHOD);
            const url = color.invocation(`${this._request.server.HTTP_HOST}${this._request.server.REQUEST_URI}`);
            term.out(`${method} ${url}`, this._request.id);
        } else {
            const argv = JSON.stringify(this._request.server.argv);
            term.out(`${color.method('PHP')} ${color.invocation(argv)}`, this._request.id);
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
        term.out(color.reset(`${indentation}${callId}${marker}${functionName}${argumentList}${fileInfo}`), this._request.id);
    }

    formatReturn(return_) {
        // format return and print
        const indentation = indent(return_.level, this._options.shallow);
        const json_value = JSON.stringify(return_.return.value);
        const callId = this._options.shallow ? `${color.shadow(return_.id)} ` : '';
        term.out(color.reset(`${indentation}${callId}${color.function('=')} ${json_value}`), this._request.id);
    }

    formatWarning(warning) {
        this._formatHeaderIfNeeded();
        term.err(warning.message, this._request.id);
    }
}

module.exports = Formatter;
