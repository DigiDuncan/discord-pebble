const nspect = require("nspect");

var _console = Object.assign({}, console);

const stripUnicode = s => s.replace(/[\u{0080}-\u{1FFFF}]/gu, "×");

const get_caller = function(levels) {
    const caller_line = (new Error).stack.split("\n")[levels + 1];
    const [_, functionname, packed_lineno, col] = caller_line.match(/at (.*) \(.*:(\d+):(\d+)\)/);
    const package = __loader.getPackageByLineno(packed_lineno);
    return {
        filename: package.filename,
        functionname: functionname,
        lineno: packed_lineno - package.lineno,
        col: col
    };
};

const prep_message = function(msg, args) {
    const caller = get_caller(3);
    const prefix = `${caller.filename}[${caller.functionname}:${caller.lineno}] `;
    if (typeof msg !== "string") {
        msg = nspect(msg);
    }
    args = args.map(a => nspect(a));
    args.unshift(msg);
    var out = prefix + args.join(" ");
    out = stripUnicode(out);
    out = out.slice(0, 20000);
    return out;
};

const debug = (m, ...args) => _console.debug(prep_message(m, args));
const info = (m, ...args) => _console.info(prep_message(m, args));
const log = (m, ...args) => _console.log(prep_message(m, args));
const warn = (m, ...args) => _console.warn(prep_message(m, args));
const error = (m, ...args) => _console.error(prep_message(m, args));

module.exports = {
    debug,
    info,
    log,
    warn,
    error
};
