const chalk = require('chalk');

module.exports = {
    isEnabled: chalk.enabled,
    reset: chalk.white,

    shadow: chalk.gray,
    function: chalk.green,
    argument: chalk.cyan,
    highlight: chalk.red,
    context: chalk.blue,
    error: chalk.red,
    method: chalk.white.bold,
    invocation: chalk.yellow
};
