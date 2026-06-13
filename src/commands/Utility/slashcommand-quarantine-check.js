const { ChatInputCommandInteraction, MessageFlags, EmbedBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const { runGuildQuarantineCheck, getKeyword } = require("../../utils/quarantine");
const config = require("../../config");

const ESTIMATE_SECONDS_PER_MEMBER = 1.5;
const PROGRESS_UPDATE_INTERVAL_MS = 10000;
const PROGRESS_EDIT_INTERVAL_MS = 5000;
const MIN_PACE_SAMPLES = 5;

/**
 * @param {{ current: number, total: number, scanStartTime: number | null }} progress
 * @param {{ lowestEta: number | null }} state
 */
const getProgressMessage = (progress, state) => {
    const { current, total, scanStartTime } = progress;

    if (total <= 0) {
        return 'Checking all users, time till finished: **estimating**...';
    }

    const remainingMembers = total - current;

    if (remainingMembers <= 0) {
        return 'Checking all users, finishing up...';
    }

    let secondsLeft;

    if (!scanStartTime) {
        secondsLeft = Math.max(1, Math.ceil(total * ESTIMATE_SECONDS_PER_MEMBER));
    } else {
        const elapsedSeconds = (Date.now() - scanStartTime) / 1000;
        const initialEstimate = total * ESTIMATE_SECONDS_PER_MEMBER;

        if (current < MIN_PACE_SAMPLES) {
            secondsLeft = Math.max(1, Math.ceil(initialEstimate - elapsedSeconds));
        } else {
            const secondsPerMember = elapsedSeconds / current;
            secondsLeft = Math.max(1, Math.ceil(secondsPerMember * remainingMembers));
        }
    }

    if (state.lowestEta !== null) {
        secondsLeft = Math.min(state.lowestEta, secondsLeft);
    }

    state.lowestEta = secondsLeft;

    const label = secondsLeft === 1 ? 'second' : 'seconds';

    return `Checking all users (${current}/${total}), time till finished: **${secondsLeft}** ${label}...`;
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
        const progress = { current: 0, total: 0, scanStartTime: null };
        const etaState = { lowestEta: null };
        let lastProgressEdit = 0;
        let progressEditPending = false;

        const refreshProgressMessage = async (force = false) => {
            const now = Date.now();

            if (!force && now - lastProgressEdit < PROGRESS_EDIT_INTERVAL_MS) {
                if (!progressEditPending) {
                    progressEditPending = true;
                    setTimeout(() => {
                        progressEditPending = false;
                        refreshProgressMessage(true);
                    }, PROGRESS_EDIT_INTERVAL_MS - (now - lastProgressEdit));
                }
                return;
            }

            lastProgressEdit = Date.now();
            await interaction.editReply({
                content: getProgressMessage(progress, etaState)
            }).catch(() => null);
        };

        await interaction.editReply({
            content: 'Checking all users, time till finished: **estimating**...'
        });

        const interval = setInterval(() => {
            refreshProgressMessage(true);
        }, PROGRESS_UPDATE_INTERVAL_MS);

        let result;

        try {
            result = await runGuildQuarantineCheck(interaction.guild, client, async (current, total, scanStarted) => {
                progress.current = current;
                progress.total = total;

                if (scanStarted) {
                    progress.scanStartTime = Date.now();
                }

                refreshProgressMessage(scanStarted || current === 0);
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
