const Event = require("../../structure/Event");
const syncCommandPermissions = require("../../utils/syncCommandPermissions");

module.exports = new Event({
    event: 'guildCreate',
    once: false,
    run: async (client, guild) => {
        await syncCommandPermissions(client);
    }
}).toJSON();
