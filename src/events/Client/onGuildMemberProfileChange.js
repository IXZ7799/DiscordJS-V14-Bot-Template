const Event = require("../../structure/Event");
const config = require("../../config");
const {
    sendProfileChangeLog,
    getLogGuild,
    formatNewValue,
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

        const changes = [];

        if (oldMember.nickname !== newMember.nickname) {
            changes.push({
                title: 'Server nickname update',
                detail: formatNewValue(newMember.nickname)
            });
        }

        if (oldMember.avatar !== newMember.avatar) {
            changes.push({
                title: 'Server profile picture update',
                thumbnailUrl: newMember.avatar
                    ? guildAvatarUrl(newMember, newMember.avatar)
                    : newMember.displayAvatarURL({ size: 4096 })
            });
        }

        if (!changes.length) return;

        for (const change of changes) {
            await sendProfileChangeLog(logGuild, newMember.user, change);
        }
    }
}).toJSON();
