const Event = require("../../structure/Event");
const { checkAndQuarantine } = require("../../utils/quarantine");

module.exports = new Event({
    event: 'userUpdate',
    once: false,
    run: async (client, _oldUser, newUser) => {
        for (const guild of client.guilds.cache.values()) {
            const member = guild.members.cache.get(newUser.id);
            if (!member) continue;

            await checkAndQuarantine(member, client);
        }
    }
}).toJSON();
