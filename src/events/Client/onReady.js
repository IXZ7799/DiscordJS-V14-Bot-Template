const { success, warn } = require("../../utils/Console");
const Event = require("../../structure/Event");
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

        if (config.quarantine?.enabled !== false && config.quarantine?.flagChannelId) {
            success(`[Quarantine] Watching for "${config.quarantine.keyword ?? 'vani'}" -> channel ${config.quarantine.flagChannelId}`);
        } else {
            warn('[Quarantine] Disabled or flagChannelId not set in config');
        }
    }
}).toJSON();
