const Event = require("../../structure/Event");
const config = require("../../config");
const { info, warn } = require("../../utils/Console");
const {
    sendProfileChangeLog,
    getProfileLogTarget,
    getTextChangeTitle,
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
        if (!target) return;

        if (newMember.guild.id !== target.guild.id) return;

        const changes = [];
        const user = newMember.user;

        if (oldMember.user.username !== user.username) {
            changes.push({
                type: 'username',
                style: 'text',
                title: getTextChangeTitle('Username', oldMember.user.username, user.username),
                before: oldMember.user.username,
                after: user.username
            });
        }

        if (oldMember.user.globalName !== user.globalName) {
            changes.push({
                type: 'globalName',
                style: 'text',
                title: getTextChangeTitle('Display name', oldMember.user.globalName, user.globalName),
                before: oldMember.user.globalName,
                after: user.globalName,
                beforeFallback: user.username
            });
        }

        if (oldMember.user.avatar !== user.avatar) {
            changes.push({
                type: 'avatar',
                style: 'avatar',
                title: 'Avatar update',
                thumbnailUrl: avatarUrl(user, user.avatar)
            });
        }

        if (oldMember.nickname !== newMember.nickname) {
            changes.push({
                type: 'nickname',
                style: 'text',
                title: getTextChangeTitle('Nickname', oldMember.nickname, newMember.nickname),
                before: oldMember.nickname,
                after: newMember.nickname,
                beforeFallback: user.username
            });
        }

        if (oldMember.avatar !== newMember.avatar) {
            changes.push({
                type: 'serverAvatar',
                style: 'avatar',
                title: 'Server avatar update',
                thumbnailUrl: newMember.avatar
                    ? guildAvatarUrl(newMember, newMember.avatar)
                    : newMember.displayAvatarURL({ size: 4096 })
            });
        }

        if (!changes.length) return;

        info(`[ProfileWatch] guildMemberUpdate: logging ${changes.length} change(s) for ${newMember.id}`);

        for (const change of changes) {
            await sendProfileChangeLog(target, user, change);
        }
    }
}).toJSON();
