function msleep(n) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, s*1000));
}

module.exports = { msleep, sleep };