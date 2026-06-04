const { EmbedBuilder } = require('discord.js');

const HIGHLIGHT_COLOR = 0xFFD966;

/**
 * @param {string} word
 * @param {string} content
 */
const buildHighlightDescription = (word, content) => {
    const lower = content.toLowerCase();
    const index = lower.indexOf(word.toLowerCase());

    if (index === -1) return `__**${word}**__`;

    const matched = content.substring(index, index + word.length);
    const before = content.slice(0, index);
    const after = content.slice(index + matched.length);

    return `${before}__**${matched}**__${after}`.trim().slice(0, 4096);
};

/**
 * @param {import('discord.js').Message} message
 * @param {string} word
 * @param {string} recipientId
 */
const sendHighlightDm = async (message, word, recipientId) => {
    const { guild, channel, author } = message;
    if (!guild || !channel.isTextBased()) return;

    const recipient = await message.client.users.fetch(recipientId).catch(() => null);
    if (!recipient) return;

    const title = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    const jumpUrl = `https://discord.com/channels/${guild.id}/${channel.id}/${message.id}`;

    const embed = new EmbedBuilder()
        .setAuthor({
            name: author.displayName ?? author.username,
            iconURL: author.displayAvatarURL({ size: 1024 })
        })
        .setTitle(title)
        .setDescription(buildHighlightDescription(word, message.content || ''))
        .setColor(HIGHLIGHT_COLOR)
        .setTimestamp(message.createdAt)
        .setFooter({ text: 'Triggered' })
        .addFields({
            name: 'Source message',
            value: jumpUrl,
            inline: true
        });

    await recipient.send({
        content: `In <#${channel.id}>, you were highlighted with the word "${word}"`,
        embeds: [embed]
    });
};

module.exports = { sendHighlightDm };
