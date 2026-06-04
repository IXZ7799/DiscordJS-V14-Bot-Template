const { ChatInputCommandInteraction, MessageFlags } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { addWord, removeWord, getWords } = require("../../utils/highlights");

module.exports = new ApplicationCommand({
    command: {
        name: 'highlight',
        description: 'Manage words you get DM alerts for.',
        type: 1,
        options: [
            {
                name: 'action',
                description: 'Add, remove, or list highlighted words.',
                type: 3,
                required: true,
                choices: [
                    { name: 'Add', value: 'add' },
                    { name: 'Remove', value: 'remove' },
                    { name: 'List', value: 'list' }
                ]
            },
            {
                name: 'word',
                description: 'Word to add or remove (not needed for list).',
                type: 3,
                required: false,
                min_length: 2,
                max_length: 32
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
        const action = interaction.options.getString('action', true);
        const userId = interaction.user.id;

        if (action === 'list') {
            const words = getWords(userId);

            await interaction.reply({
                content: words.length
                    ? `**Your highlights:**\n${words.map((w) => `• ${w}`).join('\n')}`
                    : 'You have no highlighted words. Use `/highlight` with action **Add**.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const word = interaction.options.getString('word');

        if (!word?.trim()) {
            await interaction.reply({
                content: 'You must provide a **word** when adding or removing a highlight.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (action === 'add') {
            const result = addWord(userId, word);

            if (!result.ok) {
                const content = result.reason === 'already_exists'
                    ? `You are already watching **${word.trim().toLowerCase()}**.`
                    : `You can only watch up to ${config.highlights?.maxPerUser ?? 50} words. Remove one first.`;

                await interaction.reply({ content, flags: MessageFlags.Ephemeral });
                return;
            }

            await interaction.reply({
                content: `Now watching **${word.trim().toLowerCase()}** (case-insensitive). You will be DM'd when it is mentioned.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (action === 'remove') {
            const result = removeWord(userId, word);

            if (!result.ok) {
                await interaction.reply({
                    content: `You are not watching **${word.trim().toLowerCase()}**.`,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            await interaction.reply({
                content: `Removed **${word.trim().toLowerCase()}** from your highlights.`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
}).toJSON();
