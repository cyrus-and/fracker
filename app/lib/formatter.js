const RegExpSet = require('./reg-exp-set.js');
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
    }

    formatRequest() {
        const isWebRequest = !!this._request.server.REQUEST_METHOD;
        const prefix = `\n${this._request.id}`;
        if (isWebRequest) {
            const method = color.method(this._request.server.REQUEST_METHOD);
            const url = color.invocation(`${this._request.server.HTTP_HOST}${this._request.server.REQUEST_URI}`);
            term.out(`${method} ${url}`, prefix);
        } else {
            const argv = JSON.stringify(this._request.server.argv);
            term.out(`${color.method('PHP')} ${color.invocation(argv)}`, prefix);
        }
    }

    formatCall(call, type) {
        // format arguments
        let argumentList;
        if (RegExpSet.exclude(call.function, this._muteFunctionsRegexp)) {
            argumentList = color.shadow('...');
        } else {
            argumentList = call.arguments.map(({name, value, stringValue}) => {
                // omit muted arguments
                if (name && RegExpSet.exclude(name, this._muteArgumentsRegexp)) {
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
        const callId = type === 'M' && this._options.shallow && this._options.returnValues ? `${color.shadow(call.id)} ` : '';
        const marker = (!color.isEnabled || this._options.shallow) && !this._options.returnValues && type !== 'M' && (this._options.parents || this._options.children || this._options.siblings) ? `${color.shadow(type)} ` : '';
        term.out(color.reset(`${indentation}${callId}${marker}${functionName}${argumentList}${fileInfo}`), this._request.id);
    }

    formatReturn(return_) {
        // format return and print
        const indentation = indent(return_.level, this._options.shallow);
        const json_value = JSON.stringify(return_.return.value);
        const callId = this._options.shallow ? `${color.shadow(return_.id)} ` : '';
        term.out(`${indentation}${callId}${color.function('=')} ${json_value}`, this._request.id);
    }
}

module.exports = Formatter;
