const { ChatInputCommandInteraction, MessageFlags, AttachmentBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const generateTradeCard = require("../../utils/generateTradeCard");

module.exports = new ApplicationCommand({
    command: {
        name: 'post',
        description: 'Post a trade results card with your wins and losses.',
        type: 1,
        options: [
            {
                name: 'session',
                description: 'Which session card to post.',
                type: 3,
                required: true,
                choices: [
                    { name: 'NY', value: 'ny' },
                    { name: 'Asia', value: 'asia' }
                ]
            },
            {
                name: 'wins',
                description: 'Number of targets hit.',
                type: 4,
                required: true,
                min_value: 0,
                max_value: 999
            },
            {
                name: 'losses',
                description: 'Number of stop losses hit.',
                type: 4,
                required: true,
                min_value: 0,
                max_value: 999
            }
        ]
    },
    options: {
        botDevelopers: true
    },
    /**
     * @param {DiscordBot} client
     * @param {ChatInputCommandInteraction} interaction
     */
    run: async (client, interaction) => {
        const session = interaction.options.getString('session', true);
        const wins = interaction.options.getInteger('wins', true);
        const losses = interaction.options.getInteger('losses', true);

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const image = await generateTradeCard(session, wins, losses);
            const attachment = new AttachmentBuilder(image, { name: `${session}-trade-card.png` });

            await interaction.channel.send({ files: [attachment] });

            await interaction.editReply({
                content: `Posted **${session.toUpperCase()}** trade card (**${wins}** targets / **${losses}** stops).`
            });
        } catch (err) {
            await interaction.editReply({
                content: 'Could not generate the trade card. Check that the session template images exist in `assets/trade-card/`.'
            });

            throw err;
        }
    }
}).toJSON();
