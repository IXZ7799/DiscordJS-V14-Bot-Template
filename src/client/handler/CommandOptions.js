const { MessageFlags } = require("discord.js");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");

const application_commands_cooldown = new Map();

/**
 * 
 * @param {import("discord.js").Interaction} interaction 
 * @param {ApplicationCommand['data']['options']} options 
 * @param {ApplicationCommand['data']['command']} command 
 * @returns {boolean}
 */
const handleApplicationCommandOptions = async (interaction, options, command) => {
    if (options.botOwner) {
        if (interaction.user.id !== config.users.ownerId) {
            await interaction.reply({
                content: config.messages.NOT_BOT_OWNER,
                flags: MessageFlags.Ephemeral
            });

            return false;
        }
    }

    if (options.botDevelopers) {
        if (config.users?.developers?.length > 0 && !config.users?.developers?.includes(interaction.user.id)) {
            await interaction.reply({
                content: config.messages.NOT_BOT_DEVELOPER,
                flags: MessageFlags.Ephemeral
            });

            return false;
        }
    }

    if (options.guildOwner) {
        if (interaction.user.id !== interaction.guild.ownerId) {
            await interaction.reply({
                content: config.messages.NOT_GUILD_OWNER,
                flags: MessageFlags.Ephemeral
            });

            return false;
        }
    }

    if (options.cooldown) {
        const cooldownFunction = () => {
            let data = application_commands_cooldown.get(interaction.user.id);

            data.push(interaction.commandName);

            application_commands_cooldown.set(interaction.user.id, data);

            setTimeout(() => {
                let data = application_commands_cooldown.get(interaction.user.id);

                data = data.filter((v) => v !== interaction.commandName);

                if (data.length <= 0) {
                    application_commands_cooldown.delete(interaction.user.id);
                } else {
                    application_commands_cooldown.set(interaction.user.id, data);
                }
            }, options.cooldown);
        }

        if (application_commands_cooldown.has(interaction.user.id)) {
            let data = application_commands_cooldown.get(interaction.user.id);

            if (data.some((cmd) => cmd === interaction.commandName)) {
                await interaction.reply({
                    content: config.messages.GUILD_COOLDOWN.replace(/%cooldown%/g, options.cooldown / 1000),
                    flags: MessageFlags.Ephemeral
                });

                return false;
            } else {
                cooldownFunction();
            }
        } else {
            application_commands_cooldown.set(interaction.user.id, [interaction.commandName]);
            cooldownFunction();
        }
    }

    return true;
}

module.exports = { handleApplicationCommandOptions }
