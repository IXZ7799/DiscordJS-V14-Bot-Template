const Event = require("../../structure/Event");
const { info } = require("../../utils/Console");
const { checkAndQuarantine } = require("../../utils/quarantine");

module.exports = new Event({
    event: 'guildMemberUpdate',
    once: false,
    run: async (client, oldMember, newMember) => {
        if (oldMember.partial) {
            try { await oldMember.fetch(); } catch { return; }
        }

        if (newMember.partial) {
            try { await newMember.fetch(); } catch { return; }
        }

        if (newMember.user.bot) return;

        const memberChanged = oldMember.nickname !== newMember.nickname
            || oldMember.avatar !== newMember.avatar
            || oldMember.user.username !== newMember.user.username
            || oldMember.user.globalName !== newMember.user.globalName
            || oldMember.user.avatar !== newMember.user.avatar;

        if (!memberChanged) return;

        info(`[Quarantine] guildMemberUpdate for ${newMember.user.tag} in ${newMember.guild.name}`);

        await checkAndQuarantine(newMember, client, newMember.user);
    }
}).toJSON();
