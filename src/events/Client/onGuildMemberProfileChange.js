const Event = require("../../structure/Event");
const config = require("../../config");
const {
    sendProfileChangeLog,
    getProfileLogTarget,
    formatNewValue,
    avatarUrl,
    guildAvatarUrl
} = require("../../utils/profileChangeLog");

module.exports = new Event({
    event: 'guildMemberUpdate',
    once: false,
    run: async (client, oldMember, newMember) => {
        if (!config.profileWatch?.logChannelId) return;

        if (oldMember.partial) {
            try { await oldMember.fetch(); } catch { return; }
        }

        if (newMember.partial) {
            try { await newMember.fetch(); } catch { return; }
        }

        if (newMember.user.bot) return;

        const target = await getProfileLogTarget(client);
        if (!target || newMember.guild.id !== target.guild.id) return;

        const changes = [];
        const user = newMember.user;

        if (oldMember.user.username !== user.username) {
            changes.push({
                type: 'username',
                title: 'Username update',
                detail: formatNewValue(user.username)
            });
        }

        if (oldMember.user.globalName !== user.globalName) {
            changes.push({
                type: 'globalName',
                title: 'Display name update',
                detail: formatNewValue(user.globalName)
            });
        }

        if (oldMember.user.avatar !== user.avatar) {
            changes.push({
                type: 'avatar',
                title: 'Avatar update',
                thumbnailUrl: avatarUrl(user, user.avatar)
            });
        }

        if (oldMember.nickname !== newMember.nickname) {
            changes.push({
                type: 'nickname',
                title: 'Server nickname update',
                detail: formatNewValue(newMember.nickname)
            });
        }

        if (oldMember.avatar !== newMember.avatar) {
            changes.push({
                type: 'serverAvatar',
                title: 'Server profile picture update',
                thumbnailUrl: newMember.avatar
                    ? guildAvatarUrl(newMember, newMember.avatar)
                    : newMember.displayAvatarURL({ size: 4096 })
            });
        }

        for (const change of changes) {
            await sendProfileChangeLog(target, user, change);
        }
    }
}).toJSON();
