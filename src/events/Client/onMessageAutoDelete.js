const { EmbedBuilder } = require("discord.js");
const Event = require("../../structure/Event");
const config = require("../../config");
const { info } = require("../../utils/Console");
const deleteUserMessagesToday = require("../../utils/deleteUserMessagesToday");

/**
 * @param {import('discord.js').Message} message
 */
const getDeletedImageUrl = (message) => {
    const attachment = message.attachments.find((a) => a.contentType?.startsWith('image/'));
    if (attachment) return attachment.url;

    for (const embed of message.embeds) {
        if (embed.image?.url) return embed.image.url;
        if (embed.thumbnail?.url) return embed.thumbnail.url;
    }

    return null;
};

/**
 * @param {import('discord.js').Message} message
 */
const getDeletedContent = (message) => {
    const parts = [];

    if (message.content != null && message.content.length > 0) {
        parts.push(message.content);
    }

    if (message.stickers?.size) {
        parts.push(`Sticker: ${[...message.stickers.values()].map((s) => s.name).join(', ')}`);
    }

    for (const attachment of message.attachments.values()) {
        if (attachment.contentType?.startsWith('image/')) {
            parts.push(`[Image: ${attachment.name}](${attachment.url})`);
        } else {
            parts.push(`[File: ${attachment.name}](${attachment.url})`);
        }
    }

    for (const embed of message.embeds) {
        const embedParts = [embed.title, embed.description, embed.url].filter(Boolean);
        if (embedParts.length) parts.push(embedParts.join('\n'));
    }

    return parts.join('\n');
};

/**
 * @param {import('discord.js').User} user
 * @param {{ channelId: string, messageId: string, content: string, imageUrl: string | null }} context
 */
const createBanEmbed = (user, context) => {
    const avatarURL = user.displayAvatarURL({ size: 4096 });
    const header = `Message sent by <@${user.id}> deleted in <#${context.channelId}>`;
    const body = context.content.length ? context.content : '*No message content was captured*';
    const description = `${header}\n\n${body.length > 3900 ? `${body.slice(0, 3897)}...` : body}`;

    const embed = new EmbedBuilder()
        .setAuthor({
            name: user.username,
            iconURL: avatarURL
        })
        .setDescription(description)
        .setColor(0xEE7026)
        .setFooter({ text: `Author: ${user.id} | Message ID: ${context.messageId}` })
        .setTimestamp();

    if (context.imageUrl) {
        embed.setImage(context.imageUrl);
    }

    return embed;
};

module.exports = new Event({
    event: 'messageCreate',
    once: false,
    run: async (client, message) => {
        if (!message.guild) return;
        if (message.author.id === client.user.id) return;
        if (!config.moderation?.autoDeleteChannelIds?.includes(message.channelId)) return;

        const { author, guild } = message;

        if (message.partial) {
            try {
                await message.fetch();
            } catch {
                info(`[AutoBan] Could not fetch partial message ${message.id}`);
            }
        }

        const banContext = {
            channelId: message.channelId,
            messageId: message.id,
            content: getDeletedContent(message),
            imageUrl: getDeletedImageUrl(message)
        };

        info(`[AutoBan] Captured message ${message.id} from ${author.tag}: "${banContext.content}"`);

        try {
            await message.delete();
        } catch {
            // Missing permissions, message already deleted, or too old to delete.
        }

        try {
            const member = message.member ?? await guild.members.fetch(author.id).catch(() => null);

            if (member && !member.bannable) return;

            await deleteUserMessagesToday(guild, author.id);

            await guild.members.ban(author.id, {
                reason: 'Auto-ban: sent a message in a restricted channel'
            });

            const logChannelId = config.moderation?.banLogChannelId;
            if (!logChannelId) return;

            const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
            if (!logChannel?.isTextBased()) return;

            await logChannel.send({ embeds: [createBanEmbed(author, banContext)] });
        } catch {
            // Missing permissions, user already banned, or role hierarchy blocks ban.
        }
    }
}).toJSON();
