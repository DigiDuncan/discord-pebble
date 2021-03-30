const nspect = function(obj) {
    var dumped = dump([], obj);
    return JSON.stringify(dumped);
};

const dump = function(seen, o) {
    if (o === undefined) {
        return "[UNDEFINED]";
    }

    if (isFunction(o)) {
        return dumpFunction(o);
    }

    if (isArray(o)) {
        return dumpArray(seen, o);
    }

    if (isObject(o)) {
        return dumpObject(seen, o);
    }

    return o;
};

const dumpIfNew = function(seen, v) {
    var dumped;
    if (seen.includes(v)) {
        dumped = "[CIRCULAR]";
    }
    else {
        dumped = dump(seen, v);
    }
    return dumped;
};

const dumpFunction = function(f) {
    var name = f.name ? ": " + f.name : "";
    return "[Function" + name + "]";
};

const getKeys = function(obj) {
    var keys = [];
    while (Object.getPrototypeOf(obj) != null) {
        let names = Object.getOwnPropertyNames(obj);
        names.forEach(function(n) {
            if (n.startsWith("_")) {
                return;
            }
            if (keys.includes(n)) {
                return;
            }
            keys.push(n);
        });
        obj = Object.getPrototypeOf(obj);
    }
    keys.sort();
    return keys;
};

const dumpObject = function(seen, o) {
    var keys = getKeys(o);
    var out = {};
    seen.push(o);
    keys.forEach(k => out[k] = dumpIfNew(seen, o[k]));
    seen.pop();
    return out;
};

const dumpArray = function(seen, a) {
    seen.push(a);
    var dumped = a.map(v => dumpIfNew(seen, v));
    seen.pop();
    return dumped;
};

const isFunction = function(arg) {
    return typeof arg === "function";
};

const isObject = function(arg) {
    return isBaseObject(arg) && !Array.isArray(arg);
};

const isArray = function(arg) {
    return isBaseObject(arg) && Array.isArray(arg);
};

const isBaseObject = function(arg) {
    return typeof arg === "object" && arg !== null;
};

module.exports = nspect;
