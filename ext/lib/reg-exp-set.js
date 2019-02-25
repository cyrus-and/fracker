const fs = require('fs');

class RegExpSet {
    constructor(regexp, ignoreCase, literally = false) {
        this._regexps = new Set();
        this._ignoreCase = ignoreCase;
        this._cache = undefined;

        // add initial entry for convenience
        this.add(regexp, literally);
    }

    add(regexp, literally = false) {
        const regexpArray = Array.isArray(regexp) ? regexp : [regexp];
        regexpArray.filter((x) => !!x).forEach((regexp) => {
            this._cache = undefined;
            if (literally) {
                // escape to to match literally
                this._regexps.add(escapeRegExp(regexp));
            } else {
                // read from file if needed
                for (const entry of regexpOrFile(regexp)) {
                    this._regexps.add(entry);
                }
            }
        });
    }

    isEmpty() {
        return !this._regexps.size;
    }

    get() {
        // update cache if changed
        if (!this._cache) {
            this._cache = this._merge();
        }

        return this._cache;
    }

    _merge() {
        // expand from files if needed, drop empty and wrap in () joined by |
        if (this._regexps.size) {
            // join with | wrap everything in () and modifiers
            const expression = `(${([...this._regexps.values()]).join('|')})`;
            const modifiers = `mg${this._ignoreCase ? 'i' : ''}`;
            return RegExp(expression, modifiers);
        } else {
            // always match
            return RegExp();
        }
    }

    // true if match include but not exclude (where empty include always match)
    static match(string, include, exclude) {
        return string.match(include.get()) && !RegExpSet.exclude(string, exclude);
    }

    // true if do not match exclude (where empty exclude never matches)
    static exclude(string, exclude) {
        return !exclude.isEmpty() && string.match(exclude.get());
    }
}

// TODO also escape newline and such as the break the regexp? try this
// XXX https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function* regexpOrFile(value) {
    if (value.startsWith('@@')) {
        yield value.slice(1);
    } else if (value.startsWith('@')) {
        yield* fs.readFileSync(value.slice(1)).toString().split('\n').filter((x) => !!x);
    } else {
        yield value;
    }
}

module.exports = RegExpSet;
