const Event = require("../../structure/Event");
const { info } = require("../../utils/Console");
const { checkAndQuarantine, checkUserInAllGuilds } = require("../../utils/quarantine");

module.exports = new Event({
    event: 'userUpdate',
    once: false,
    run: async (client, oldUser, newUser) => {
        if (newUser.bot) return;

        const profileChanged = oldUser.username !== newUser.username
            || oldUser.globalName !== newUser.globalName
            || oldUser.avatar !== newUser.avatar;

        if (!profileChanged) return;

        info(`[Quarantine] userUpdate for ${newUser.tag} — username: ${oldUser.username} -> ${newUser.username}, globalName: ${oldUser.globalName ?? 'null'} -> ${newUser.globalName ?? 'null'}`);

        await checkUserInAllGuilds(client, newUser);
    }
}).toJSON();
