const RegExpSet = require('./reg-exp-set.js');

class ObjectWalker {
    constructor(include, exclude, valuesOnly, excludeNonString) {
        this._include = include;
        this._exclude = exclude;
        this._valuesOnly = valuesOnly;
        this._excludeNonString = excludeNonString;
    }

    *walk(object) {
        if (typeof(object) === 'object') {
            for (const i in object) {
                // add key if proper object and requested
                if (!Array.isArray(object) && !this._valuesOnly) {
                    yield* this.walk(i);
                }

                // add value
                yield* this.walk(object[i]);
            }
        } else {
            // skip or convert non-string arguments
            if (typeof(object) !== 'string') {
                if (this._excludeNonString) {
                    return;
                } else {
                    object = String(object);
                }
            }

            // apply regexps to include/exclude the value
            if (RegExpSet.match(object, this._include, this._exclude)) {
                yield object;
            }
        }
    }
}

module.exports = ObjectWalker;
