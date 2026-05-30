const { ChatInputCommandInteraction, MessageFlags } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const restartBot = require("../../utils/restart");

module.exports = new ApplicationCommand({
    command: {
        name: 'restart',
        description: 'Restart the bot process.',
        type: 1,
        options: []
    },
    options: {
        botDevelopers: true
    },
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        await interaction.reply({
            content: 'Restarting the bot...',
            flags: MessageFlags.Ephemeral
        });

        restartBot(client);
    }
}).toJSON();
