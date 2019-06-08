const color = require('./color.js');

const DEFAULT_MARKER_WIDTH = 3;

function write(stream, style, text, marker) {
    stream.write(style(`${marker} │${text ? ` ${text}` : ''}`));
    stream.write('\n');
}

function out(text, marker) {
    write(process.stdout, color.shadow, text, marker || '+'.repeat(DEFAULT_MARKER_WIDTH));
}

function log(text, marker) {
    write(process.stderr, color.shadow, text, marker || '+'.repeat(DEFAULT_MARKER_WIDTH));
}

function err(text, marker) {
    write(process.stderr, color.error, text, marker || '!'.repeat(DEFAULT_MARKER_WIDTH));
}

module.exports = {DEFAULT_MARKER_WIDTH, out, log, err};
