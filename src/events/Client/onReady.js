const { success, info, warn } = require("../../utils/Console");
const Event = require("../../structure/Event");
const { scanGuildMembers } = require("../../utils/quarantine");
const { getProfileLogTarget } = require("../../utils/profileChangeLog");
const config = require("../../config");

module.exports = new Event({
    event: 'clientReady',
    once: true,
    run: async (__client__, client) => {
        success('Logged in as ' + client.user.displayName + ', took ' + ((Date.now() - __client__.login_timestamp) / 1000) + "s.");

        if (config.profileWatch?.logChannelId) {
            const target = await getProfileLogTarget(client);
            if (target) {
                success(`[ProfileWatch] Watching profile changes -> #${target.channel.name} (${config.profileWatch.logChannelId})`);
            } else {
                warn(`[ProfileWatch] Could not access log channel ${config.profileWatch.logChannelId}`);
            }
        } else {
            warn('[ProfileWatch] Disabled: profileWatch.logChannelId not set in config');
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
