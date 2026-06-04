const Event = require("../../structure/Event");
const { checkAndQuarantine } = require("../../utils/quarantine");

module.exports = new Event({
    event: 'guildMemberAdd',
    once: false,
    run: async (client, member) => {
        await checkAndQuarantine(member, client);
    }
}).toJSON();
