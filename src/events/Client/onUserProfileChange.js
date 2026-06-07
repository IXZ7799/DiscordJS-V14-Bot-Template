const Event = require("../../structure/Event");
const config = require("../../config");
const {
    sendProfileChangeLog,
    getLogGuild,
    formatText,
    avatarUrl
} = require("../../utils/profileChangeLog");

module.exports = new Event({
    event: 'userUpdate',
    once: false,
    run: async (client, oldUser, newUser) => {
        if (!config.profileWatch?.logChannelId) return;
        if (newUser.bot) return;

        const fields = [];

        if (oldUser.username !== newUser.username) {
            fields.push({
                name: 'Username',
                value: `${formatText(oldUser.username)} → ${formatText(newUser.username)}`
            });
        }

        if (oldUser.globalName !== newUser.globalName) {
            fields.push({
                name: 'Display Name',
                value: `${formatText(oldUser.globalName)} → ${formatText(newUser.globalName)}`
            });
        }

        if (oldUser.avatar !== newUser.avatar) {
            const before = avatarUrl(oldUser, oldUser.avatar);
            const after = avatarUrl(newUser, newUser.avatar);

            fields.push({
                name: 'Profile Picture',
                value: `[Before](${before}) → [After](${after})`
            });
        }

        if (!fields.length) return;

        for (const guild of client.guilds.cache.values()) {
            const logGuild = await getLogGuild(client, guild.id);
            if (!logGuild) continue;

            const member = await logGuild.members.fetch(newUser.id).catch(() => null);
            if (!member) continue;

            const thumbnailUrl = oldUser.avatar !== newUser.avatar
                ? avatarUrl(newUser, newUser.avatar)
                : null;

            await sendProfileChangeLog(client, logGuild, newUser, fields, thumbnailUrl);
            break;
        }
    }
}).toJSON();
