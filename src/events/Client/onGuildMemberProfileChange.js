const Event = require("../../structure/Event");
const config = require("../../config");
const { info, warn } = require("../../utils/Console");
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
        info(`[ProfileWatch] guildMemberUpdate fired for ${newMember.user.tag} (${newMember.id}) in ${newMember.guild.name}`);

        if (!config.profileWatch?.logChannelId) {
            warn('[ProfileWatch] guildMemberUpdate skipped: profileWatch.logChannelId not set');
            return;
        }

        if (oldMember.partial) {
            try { await oldMember.fetch(); } catch {
                warn(`[ProfileWatch] guildMemberUpdate: failed to fetch oldMember ${newMember.id}`);
                return;
            }
        }

        if (newMember.partial) {
            try { await newMember.fetch(); } catch {
                warn(`[ProfileWatch] guildMemberUpdate: failed to fetch newMember ${newMember.id}`);
                return;
            }
        }

        if (newMember.user.bot) {
            info('[ProfileWatch] guildMemberUpdate skipped: user is a bot');
            return;
        }

        info(`[ProfileWatch] guildMemberUpdate compare — username: ${oldMember.user.username} -> ${newMember.user.username}, globalName: ${oldMember.user.globalName ?? 'null'} -> ${newMember.user.globalName ?? 'null'}, user.avatar: ${oldMember.user.avatar ?? 'null'} -> ${newMember.user.avatar ?? 'null'}, nickname: ${oldMember.nickname ?? 'null'} -> ${newMember.nickname ?? 'null'}, member.avatar: ${oldMember.avatar ?? 'null'} -> ${newMember.avatar ?? 'null'}`);

        const target = await getProfileLogTarget(client);
        if (!target) return;

        if (newMember.guild.id !== target.guild.id) {
            info(`[ProfileWatch] guildMemberUpdate skipped: guild ${newMember.guild.name} is not the log guild ${target.guild.name}`);
            return;
        }

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

        if (!changes.length) {
            info(`[ProfileWatch] guildMemberUpdate: no tracked changes for ${newMember.id}`);
            return;
        }

        info(`[ProfileWatch] guildMemberUpdate: ${changes.length} change(s) for ${newMember.id}:`, changes.map((c) => c.type).join(', '));

        for (const change of changes) {
            await sendProfileChangeLog(target, user, change);
        }
    }
}).toJSON();
