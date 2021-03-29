var console_log = console.log;

function stripUnicode(s) {
    return s.replace(/[\u{0080}-\u{1FFFF}]/gu, "×");
}

function log() {
    var args = Array.from(arguments);
    var msg = args.shift();
    if (typeof msg !== "string") {
        msg = inspect(msg);
    }
    args = args.map(a => inspect(a));
    args.unshift(msg);
    var out = args.join(" ");
    out = stripUnicode(out);
    console_log(out);
}
module.exports.log = log;

function inspect(obj) {
    var dumped = dump([], obj);
    return JSON.stringify(dumped);
}
module.exports.inspect = inspect;

function dump(seen, o) {
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
}

function dumpIfNew(seen, v) {
    var dumped;
    if (seen.includes(v)) {
        dumped = "[CIRCULAR]";
    }
    else {
        dumped = dump(seen, v);
    }
    return dumped;
}

function isFunction(arg) {
    return typeof arg === "function";
}

function dumpFunction(f) {
    var name = f.name ? ": " + f.name : "";
    return "[Function" + name + "]";
}

function isString(arg) {
    return typeof arg === "string";
}

function isNumber(arg) {
    return typeof arg === "number";
}

function isNull(arg) {
    return arg === null;
}

function isRegExp(re) {
    return isObject(re) && objectToString(re) === "[object RegExp]";
}

function isObject(arg) {
    return typeof arg === "object" && arg !== null;
}

function getKeys(obj) {
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
}

function dumpObject(seen, o) {
    var keys = getKeys(o);
    var out = {};
    seen.push(o);
    keys.forEach(k => out[k] = dumpIfNew(seen, o[k]));
    seen.pop();
    return out;
}

function isError(e) {
    return isObject(e) && (objectToString(e) === "[object Error]" || e instanceof Error);
}

function isDate(d) {
    return isObject(d) && objectToString(d) === "[object Date]";
}

function isArray(a) {
    return isObject(a) && Array.isArray(a);
}

function dumpArray(seen, a) {
    seen.push(a);
    var dumped = a.map(v => dumpIfNew(seen, v));
    seen.pop();
    return dumped;
}

function objectToString(o) {
    return Object.prototype.toString.call(o);
}
