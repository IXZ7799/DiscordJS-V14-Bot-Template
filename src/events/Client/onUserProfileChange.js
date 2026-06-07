const Event = require("../../structure/Event");
const config = require("../../config");
const { info, warn } = require("../../utils/Console");
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
        info(`[ProfileWatch] userUpdate fired for ${newUser.tag} (${newUser.id})`);

        if (!config.profileWatch?.logChannelId) {
            warn('[ProfileWatch] userUpdate skipped: profileWatch.logChannelId not set');
            return;
        }

        if (newUser.bot) {
            info('[ProfileWatch] userUpdate skipped: user is a bot');
            return;
        }

        info(`[ProfileWatch] userUpdate compare — username: ${oldUser.username} -> ${newUser.username}, globalName: ${oldUser.globalName ?? 'null'} -> ${newUser.globalName ?? 'null'}, avatar: ${oldUser.avatar ?? 'null'} -> ${newUser.avatar ?? 'null'}`);

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

        if (!changes.length) {
            info(`[ProfileWatch] userUpdate: no tracked changes for ${newUser.id}`);
            return;
        }

        info(`[ProfileWatch] userUpdate: ${changes.length} change(s) for ${newUser.id}:`, changes.map((c) => c.type).join(', '));

        for (const change of changes) {
            await sendProfileChangeLog(target, newUser, change);
        }
    }
}).toJSON();
