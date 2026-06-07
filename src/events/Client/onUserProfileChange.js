const Event = require("../../structure/Event");
const config = require("../../config");
const {
    sendProfileChangeLog,
    getProfileLogTarget,
    isMemberInGuild,
    formatNewValue,
    avatarUrl
} = require("../../utils/profileChangeLog");

module.exports = new Event({
    event: 'userUpdate',
    once: false,
    run: async (client, oldUser, newUser) => {
        if (!config.profileWatch?.logChannelId) return;
        if (newUser.bot) return;

        const target = await getProfileLogTarget(client);
        if (!target) return;

        if (!await isMemberInGuild(target.guild, newUser.id)) return;

        const changes = [];

        if (oldUser.username !== newUser.username) {
            changes.push({
                type: 'username',
                title: 'Username update',
                detail: formatNewValue(newUser.username)
            });
        }

        if (oldUser.globalName !== newUser.globalName) {
            changes.push({
                type: 'globalName',
                title: 'Display name update',
                detail: formatNewValue(newUser.globalName)
            });
        }

        if (oldUser.avatar !== newUser.avatar) {
            changes.push({
                type: 'avatar',
                title: 'Avatar update',
                thumbnailUrl: avatarUrl(newUser, newUser.avatar)
            });
        }

        for (const change of changes) {
            await sendProfileChangeLog(target, newUser, change);
        }
    }
}).toJSON();
