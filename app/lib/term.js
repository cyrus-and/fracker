const color = require('./color.js');

function write(stream, style, text, marker) {
    stream.write(style(`${marker} │ ${text || ''}`));
    stream.write('\n');
}

function out(text, marker) {
    write(process.stdout, color.shadow, text, marker || '+');
}

function log(text, marker) {
    write(process.stderr, color.shadow, text, marker || '+');
}

function err(text, marker) {
    write(process.stderr, color.error, text, marker || '!');
}

module.exports = {out, log, err};
