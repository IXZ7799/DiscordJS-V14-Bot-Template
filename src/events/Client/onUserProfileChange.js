const Event = require("../../structure/Event");
const config = require("../../config");
const { info, warn } = require("../../utils/Console");
const {
    sendProfileChangeLog,
    getProfileLogTarget,
    formatNewValue,
    avatarUrl
} = require("../../utils/profileChangeLog");

module.exports = new Event({
    event: 'userUpdate',
    once: false,
    run: async (client, oldUser, newUser) => {
        if (!config.profileWatch?.logChannelId) return;
        if (newUser.bot) return;

        info(`[ProfileWatch] userUpdate for ${newUser.tag} (${newUser.id})`);

        const target = await getProfileLogTarget(client);
        if (!target) return;

        const member = await target.guild.members.fetch({ user: newUser.id, force: true }).catch(() => null);
        if (!member) {
            warn(`[ProfileWatch] userUpdate: ${newUser.id} is not in ${target.guild.name}`);
            return;
        }

        info(`[ProfileWatch] compare — username: ${oldUser.username} -> ${newUser.username}, globalName: ${oldUser.globalName ?? 'null'} -> ${newUser.globalName ?? 'null'}, avatar: ${oldUser.avatar ?? 'null'} -> ${newUser.avatar ?? 'null'}`);

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

        info(`[ProfileWatch] userUpdate: logging ${changes.length} change(s): ${changes.map((c) => c.type).join(', ')}`);

        for (const change of changes) {
            await sendProfileChangeLog(target, newUser, change);
        }
    }
}).toJSON();
