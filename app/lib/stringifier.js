const Matcher = require('./matcher.js');
const color = require('./color.js');

class Stringifier {
    constructor(argumentsRegexp, excludeArgumentsRegexp) {
        this._argumentsRegexp = argumentsRegexp;
        this._excludeArgumentsRegexp = excludeArgumentsRegexp;
    }

    stringify(object) {
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
                    const result = this.stringify(element);
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
                    result = this.stringify(key);
                    if (!result) {
                        return;
                    }
                    string += result.string;
                    matched = matched || result.matched;

                    // separator
                    string += ': ';

                    // stringify the value
                    result = this.stringify(object[key]);
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
                if (Matcher.exclude(object, this._excludeArgumentsRegexp)) {
                    return null;
                } else {
                    const components = [];
                    let index = 0;
                    let match;

                    // loop over the matches
                    const regexp = this._argumentsRegexp.get();
                    while (!this._argumentsRegexp.isEmpty() && (match = regexp.exec(object)) !== null) {
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
}

module.exports = Stringifier;
