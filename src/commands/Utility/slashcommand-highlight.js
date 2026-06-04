const { ChatInputCommandInteraction, MessageFlags } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const { addWord, removeWord, getWords } = require("../../utils/highlights");

module.exports = new ApplicationCommand({
    command: {
        name: 'highlight',
        description: 'Manage words you get DM alerts for.',
        type: 1,
        options: [
            {
                name: 'add',
                description: 'Get DM alerts when this word is mentioned.',
                type: 1,
                options: [
                    {
                        name: 'word',
                        description: 'The word to watch for.',
                        type: 3,
                        required: true,
                        min_length: 2,
                        max_length: 32
                    }
                ]
            },
            {
                name: 'remove',
                description: 'Stop DM alerts for a word.',
                type: 1,
                options: [
                    {
                        name: 'word',
                        description: 'The word to remove.',
                        type: 3,
                        required: true,
                        min_length: 2,
                        max_length: 32
                    }
                ]
            },
            {
                name: 'list',
                description: 'List your highlighted words.',
                type: 1,
                options: []
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
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (sub === 'add') {
            const word = interaction.options.getString('word', true);
            const result = addWord(userId, word);

            if (!result.ok) {
                const config = require('../../config');
                const content = result.reason === 'already_exists'
                    ? `You are already watching **${word.toLowerCase()}**.`
                    : `You can only watch up to ${config.highlights?.maxPerUser ?? 50} words. Remove one first.`;

                await interaction.reply({ content, flags: MessageFlags.Ephemeral });
                return;
            }

            await interaction.reply({
                content: `Now watching **${word.toLowerCase()}**. You will be DM'd when it is mentioned.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (sub === 'remove') {
            const word = interaction.options.getString('word', true);
            const result = removeWord(userId, word);

            if (!result.ok) {
                await interaction.reply({
                    content: `You are not watching **${word.toLowerCase()}**.`,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            await interaction.reply({
                content: `Removed **${word.toLowerCase()}** from your highlights.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const words = getWords(userId);

        await interaction.reply({
            content: words.length
                ? `**Your highlights:**\n${words.map((w) => `• ${w}`).join('\n')}`
                : 'You have no highlighted words. Use `/highlight add`.',
            flags: MessageFlags.Ephemeral
        });
    }
}).toJSON();
