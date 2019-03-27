const RegExpSet = require('./reg-exp-set.js');

class Walker {
    constructor(options, userInputsRegexp, excludeUserInputsRegexp) {
        this._userInputsRegexp = userInputsRegexp;
        this._excludeUserInputsRegexp = excludeUserInputsRegexp;
    }

    *walk(object) {
        if (typeof(object) === 'object') {
            for (const key in object) {
                // add key if proper object and requested
                if (!Array.isArray(object) && !this._options.valuesOnly) {
                    yield* this.walk(key);
                }

                // add value
                yield* this.walk(object[key]);
            }
        } else {
            // skip or convert non-string arguments
            if (typeof(object) !== 'string') {
                if (this._options.excludeNonString) {
                    return;
                } else {
                    object = String(object);
                }
            }

            // apply regexps to include/exclude the value
            if (RegExpSet.match(object, this._userInputsRegexp, this._excludeUserInputsRegexp)) {
                yield object;
            }
        }
    }
}

module.exports = Walker;
