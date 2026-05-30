const { spawn } = require('child_process');

/**
 * @param {import('../client/DiscordBot')} [client]
 */
function restartBot(client) {
    setTimeout(async () => {
        try {
            if (client) await client.destroy();
        } catch {
            // Process is exiting; ignore cleanup errors.
        }

        const entry = require.main?.filename ?? process.argv[1];

        const child = spawn(process.execPath, [entry], {
            cwd: process.cwd(),
            env: process.env,
            detached: true,
            stdio: 'inherit'
        });

        child.unref();
        process.exit(0);
    }, 1000);
}

module.exports = restartBot;
