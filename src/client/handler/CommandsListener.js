const { MessageFlags } = require("discord.js");
const DiscordBot = require("../DiscordBot");
const config = require("../../config");
const { handleApplicationCommandOptions } = require("./CommandOptions");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const { error } = require("../../utils/Console");
const { isDeveloper } = require("../../utils/isDeveloper");

class CommandsListener {
    /**
     * 
     * @param {DiscordBot} client 
     */
    constructor(client) {
        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isCommand()) return;

            if (!config.commands.application_commands.chat_input && interaction.isChatInputCommand()) return;
            if (!config.commands.application_commands.user_context && interaction.isUserContextMenuCommand()) return;
            if (!config.commands.application_commands.message_context && interaction.isMessageContextMenuCommand()) return;

            /**
             * @type {ApplicationCommand['data']}
             */
            const command = client.collection.application_commands.get(interaction.commandName);

            if (!command) return;

            if (!isDeveloper(interaction.user.id)) {
                await interaction.reply({
                    content: config.messages.NOT_BOT_DEVELOPER,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            try {
                if (command.options) {
                    const commandContinue = await handleApplicationCommandOptions(interaction, command.options, command.command);

                    if (!commandContinue) return;
                }

                command.run(client, interaction);
            } catch (err) {
                error(err);
            }
        });
    }
}

module.exports = CommandsListener;
