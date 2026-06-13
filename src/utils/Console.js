require('colors');
const fs = require('fs');

const LOG_FILE = './terminal.log';

/**
 * @param {string} line
 */
const appendLog = (line) => {
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8');
};

/**
 * @param {string[]} message
 */
const info = (...message) => {
    const time = new Date().toLocaleTimeString();
    const line = [`[${time}]`.gray, '[Info]'.blue, message.join(' ')].join(' ');

    console.info(`[${time}]`.gray, '[Info]'.blue, message.join(' '));
    appendLog(line);
};

/**
 * @param {string[]} message
 */
const success = (...message) => {
    const time = new Date().toLocaleTimeString();
    const line = [`[${time}]`.gray, '[OK]'.green, message.join(' ')].join(' ');

    console.info(`[${time}]`.gray, '[OK]'.green, message.join(' '));
    appendLog(line);
};

/**
 * @param {string[]} message
 */
const error = (...message) => {
    const time = new Date().toLocaleTimeString();
    const line = [`[${time}]`.gray, '[Error]'.red, message.join(' ')].join(' ');

    console.error(`[${time}]`.gray, '[Error]'.red, message.join(' '));
    appendLog(line);
};

/**
 * @param {string[]} message
 */
const warn = (...message) => {
    const time = new Date().toLocaleTimeString();
    const line = [`[${time}]`.gray, '[Warning]'.yellow, message.join(' ')].join(' ');

    console.warn(`[${time}]`.gray, '[Warning]'.yellow, message.join(' '));
    appendLog(line);
};

module.exports = { info, success, error, warn };
