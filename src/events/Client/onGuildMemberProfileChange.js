const Event = require("../../structure/Event");
const config = require("../../config");
const {
    sendProfileChangeLog,
    getLogGuild,
    formatText,
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

        const logGuild = await getLogGuild(client, newMember.guild.id);
        if (!logGuild) return;

        const fields = [];

        if (oldMember.nickname !== newMember.nickname) {
            fields.push({
                name: 'Server Nickname',
                value: `${formatText(oldMember.nickname)} → ${formatText(newMember.nickname)}`
            });
        }

        if (oldMember.avatar !== newMember.avatar) {
            const before = guildAvatarUrl(oldMember, oldMember.avatar)
                ?? oldMember.user.displayAvatarURL({ size: 4096 });
            const after = guildAvatarUrl(newMember, newMember.avatar)
                ?? newMember.user.displayAvatarURL({ size: 4096 });

            fields.push({
                name: 'Server Profile Picture',
                value: `[Before](${before}) → [After](${after})`
            });
        }

        if (!fields.length) return;

        const thumbnailUrl = oldMember.avatar !== newMember.avatar
            ? (guildAvatarUrl(newMember, newMember.avatar) ?? newMember.displayAvatarURL({ size: 4096 }))
            : null;

        await sendProfileChangeLog(client, logGuild, newMember.user, fields, thumbnailUrl);
    }
}).toJSON();
