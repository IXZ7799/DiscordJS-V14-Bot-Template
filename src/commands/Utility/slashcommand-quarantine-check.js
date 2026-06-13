const { ChatInputCommandInteraction, MessageFlags, EmbedBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const { runGuildQuarantineCheck, getKeyword } = require("../../utils/quarantine");
const config = require("../../config");

const ESTIMATE_SECONDS_PER_MEMBER = 1.5;
const PROGRESS_UPDATE_INTERVAL_MS = 10000;

/**
 * @param {{ current: number, total: number }} progress
 * @param {number} startTime
 */
const getProgressMessage = (progress, startTime) => {
    let secondsLeft;

    if (progress.total <= 0) {
        secondsLeft = 0;
    } else if (progress.current <= 0) {
        secondsLeft = Math.max(1, Math.ceil(progress.total * ESTIMATE_SECONDS_PER_MEMBER));
    } else if (progress.current >= progress.total) {
        secondsLeft = 0;
    } else {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const secondsPerMember = elapsedSeconds / progress.current;
        secondsLeft = Math.max(1, Math.ceil(secondsPerMember * (progress.total - progress.current)));
    }

    const label = secondsLeft === 1 ? 'second' : 'seconds';

    return `Checking all users, time till finished: **${secondsLeft}** ${label}...`;
};

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
        const progress = { current: 0, total: 0 };
        const startTime = Date.now();

        await interaction.editReply({
            content: 'Checking all users, time till finished: **estimating**...'
        });

        const interval = setInterval(() => {
            interaction.editReply({
                content: getProgressMessage(progress, startTime)
            }).catch(() => null);
        }, PROGRESS_UPDATE_INTERVAL_MS);

        let result;

        try {
            result = await runGuildQuarantineCheck(interaction.guild, client, async (current, total) => {
                progress.current = current;
                progress.total = total;

                if (current === 0 && total > 0) {
                    await interaction.editReply({
                        content: getProgressMessage(progress, startTime)
                    }).catch(() => null);
                }
            });
        } finally {
            clearInterval(interval);
        }

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
