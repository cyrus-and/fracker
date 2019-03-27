class Matcher {
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
            this._regexps.add(literally ? escapeRegExp(regexp) : regexp);
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

        // in any case reset the internal index
        this._cache.lastIndex = 0;
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
        return include.get().test(string) && !Matcher.exclude(string, exclude);
    }

    // true if do not match exclude (where empty exclude never matches)
    static exclude(string, exclude) {
        return !exclude.isEmpty() && exclude.get().test(string);
    }
}

// XXX https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

module.exports = Matcher;
