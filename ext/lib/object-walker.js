const RegExpSet = require('./reg-exp-set.js');

class ObjectWalker {
    constructor(include, exclude, valuesOnly) {
        this._inlcude = include;
        this._exclude = exclude;
        this._valuesOnly = valuesOnly;
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
            // apply regexps to include/exclude the value
            const value = String(object);
            if (RegExpSet.match(value, this._include, this._exclude)) {
                yield value;
            }
        }
    }
}

module.exports = ObjectWalker;
