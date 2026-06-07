const Event = require("../../structure/Event");
const config = require("../../config");
const {
    sendProfileChangeLog,
    getLogGuild,
    formatNewValue,
    avatarUrl
} = require("../../utils/profileChangeLog");

module.exports = new Event({
    event: 'userUpdate',
    once: false,
    run: async (client, oldUser, newUser) => {
        if (!config.profileWatch?.logChannelId) return;
        if (newUser.bot) return;

        const changes = [];

        if (oldUser.username !== newUser.username) {
            changes.push({
                title: 'Username update',
                detail: formatNewValue(newUser.username)
            });
        }

        if (oldUser.globalName !== newUser.globalName) {
            changes.push({
                title: 'Display name update',
                detail: formatNewValue(newUser.globalName)
            });
        }

        if (oldUser.avatar !== newUser.avatar) {
            changes.push({
                title: 'Avatar update',
                thumbnailUrl: avatarUrl(newUser, newUser.avatar)
            });
        }

        if (!changes.length) return;

        for (const guild of client.guilds.cache.values()) {
            const logGuild = await getLogGuild(client, guild.id);
            if (!logGuild) continue;

            const member = await logGuild.members.fetch(newUser.id).catch(() => null);
            if (!member) continue;

            for (const change of changes) {
                await sendProfileChangeLog(logGuild, newUser, change);
            }

            break;
        }
    }
}).toJSON();
