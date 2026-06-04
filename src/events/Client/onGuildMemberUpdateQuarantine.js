const Event = require("../../structure/Event");
const { checkAndQuarantine } = require("../../utils/quarantine");

module.exports = new Event({
    event: 'guildMemberUpdate',
    once: false,
    run: async (client, _oldMember, newMember) => {
        const member = newMember.partial ? await newMember.fetch().catch(() => null) : newMember;
        if (!member) return;

        await checkAndQuarantine(member, client);
    }
}).toJSON();
