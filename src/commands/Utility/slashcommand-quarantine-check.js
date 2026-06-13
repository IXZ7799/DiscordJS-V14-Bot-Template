const { ChatInputCommandInteraction, MessageFlags, EmbedBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const { runGuildQuarantineCheck, getKeyword } = require("../../utils/quarantine");
const config = require("../../config");

module.exports = new ApplicationCommand({
    command: {
        name: 'quarantine-check',
        description: 'Scan all server members for quarantine violations.',
        type: 1,
        options: []
    },
    options: {
        botDevelopers: true
    },
    /**
     * @param {DiscordBot} client
     * @param {ChatInputCommandInteraction} interaction
     */
    run: async (client, interaction) => {
        if (!interaction.guild) {
            await interaction.reply({
                content: 'This command can only be used in a server.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (config.quarantine?.enabled === false) {
            await interaction.reply({
                content: 'Quarantine is disabled in config.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const keyword = getKeyword();
        let lastEdit = 0;

        const result = await runGuildQuarantineCheck(interaction.guild, client, async (current, total) => {
            const now = Date.now();
            if (current !== total && now - lastEdit < 1000) return;

            lastEdit = now;
            await interaction.editReply({
                content: `Checked user **${current}/${total}**...`
            });
        });

        const embed = new EmbedBuilder()
            .setColor(result.quarantined > 0 ? 0x9B59B6 : 0x57F287)
            .setTimestamp();

        if (result.quarantined > 0) {
            embed.setTitle('Quarantine check complete');
            embed.setDescription(
                `All **${result.checked}** members checked.\n\n` +
                `Quarantined **${result.quarantined}** ${result.quarantined === 1 ? 'person' : 'people'} for having **${keyword}** in their name.`
            );
        } else {
            embed.setTitle('Quarantine check complete');
            embed.setDescription(
                `All **${result.checked}** members checked.\n\n` +
                `No one had **${keyword}** in their username, display name, nickname, or bio.`
            );
        }

        await interaction.editReply({
            content: null,
            embeds: [embed]
        });
    }
}).toJSON();
