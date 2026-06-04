const { ApplicationCommandPermissionType } = require('discord.js');
const { info, warn } = require('./Console');
const { getDeveloperIds } = require('./isDeveloper');

/**
 * @param {import('../client/DiscordBot')} client
 */
const syncCommandPermissions = async (client) => {
    const allowedUsers = getDeveloperIds();
    const commands = await client.application.commands.fetch();

    if (!commands.size) return;

    for (const guild of client.guilds.cache.values()) {
        for (const command of commands.values()) {
            try {
                await client.application.commands.permissions.set({
                    guildId: guild.id,
                    command: command.id,
                    permissions: allowedUsers.map((id) => ({
                        id,
                        type: ApplicationCommandPermissionType.User,
                        permission: true
                    }))
                });
            } catch {
                warn(`Could not set permissions for /${command.name} in ${guild.name}`);
            }
        }

        info(`Synced slash command permissions in ${guild.name}`);
    }
};

module.exports = syncCommandPermissions;
