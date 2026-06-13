const Event = require("../../structure/Event");
const { info } = require("../../utils/Console");
const { checkAndQuarantine } = require("../../utils/quarantine");

module.exports = new Event({
    event: 'guildMemberAdd',
    once: false,
    run: async (client, member) => {
        if (member.partial) {
            try { await member.fetch(); } catch { return; }
        }

        if (member.user.bot) return;

        info(`[Quarantine] guildMemberAdd for ${member.user.tag} in ${member.guild.name}`);
        await checkAndQuarantine(member, client, member.user);
    }
}).toJSON();
