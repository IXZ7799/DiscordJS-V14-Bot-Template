const Event = require("../../structure/Event");
const config = require("../../config");
const { info, warn } = require("../../utils/Console");
const {
    sendProfileChangeLog,
    getProfileLogTarget,
    getTextChangeTitle,
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

        const changes = [];

        if (oldUser.username !== newUser.username) {
            changes.push({
                type: 'username',
                style: 'text',
                title: getTextChangeTitle('Username', oldUser.username, newUser.username),
                before: oldUser.username,
                after: newUser.username
            });
        }

        if (oldUser.globalName !== newUser.globalName) {
            changes.push({
                type: 'globalName',
                style: 'text',
                title: getTextChangeTitle('Display name', oldUser.globalName, newUser.globalName),
                before: oldUser.globalName,
                after: newUser.globalName,
                beforeFallback: newUser.username
            });
        }

        if (oldUser.avatar !== newUser.avatar) {
            changes.push({
                type: 'avatar',
                style: 'avatar',
                title: 'Avatar update',
                thumbnailUrl: avatarUrl(newUser, newUser.avatar)
            });
        }

        if (!changes.length) {
            info(`[ProfileWatch] userUpdate: no tracked changes for ${newUser.id}`);
            return;
        }

        for (const change of changes) {
            await sendProfileChangeLog(target, newUser, change);
        }
    }
}).toJSON();
