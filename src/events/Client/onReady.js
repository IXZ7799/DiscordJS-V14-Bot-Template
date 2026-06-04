const { success, info } = require("../../utils/Console");
const Event = require("../../structure/Event");
const syncCommandPermissions = require("../../utils/syncCommandPermissions");
const { scanGuildMembers } = require("../../utils/quarantine");
const config = require("../../config");

module.exports = new Event({
    event: 'clientReady',
    once: true,
    run: async (__client__, client) => {
        success('Logged in as ' + client.user.displayName + ', took ' + ((Date.now() - __client__.login_timestamp) / 1000) + "s.");

        try {
            await syncCommandPermissions(client);
        } catch {
            // Permissions sync can fail without guild scope; slash checks still apply.
        }

        if (config.quarantine?.flagChannelId) {
            info('Scanning members for quarantine violations...');

            for (const guild of client.guilds.cache.values()) {
                await scanGuildMembers(client, guild);
            }

            success('Quarantine member scan finished.');
        }
    }
}).toJSON();
