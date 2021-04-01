const delay = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const by = function(field) {
    return function(a, b) {
        if (a[field] === b[field]) {
            return 0;
        }
        else if (a[field] < b[field]) {
            return -1;
        }
        else {
            return 1;
        }
    };
};

module.exports = {
    delay,
    by
};
