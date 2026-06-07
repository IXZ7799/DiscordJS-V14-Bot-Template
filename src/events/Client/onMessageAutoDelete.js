const { EmbedBuilder } = require("discord.js");
const Event = require("../../structure/Event");
const config = require("../../config");
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
 * @param {import('discord.js').User} user
 * @param {{ channelId: string, content: string, imageUrl: string | null }} context
 */
const createBanEmbed = (user, context) => {
    const avatarURL = user.displayAvatarURL({ size: 4096 });

    const embed = new EmbedBuilder()
        .setAuthor({
            name: 'Member Banned',
            iconURL: avatarURL
        })
        .setDescription(`<@${user.id}> ${user.username} banned for posting in <#${context.channelId}>.`)
        .setColor(0xEE7026)
        .setThumbnail(avatarURL)
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp();

    const text = context.content?.trim();
    if (text) {
        embed.addFields({
            name: 'Deleted Text',
            value: text.length > 1024 ? `${text.slice(0, 1021)}...` : text
        });
    }

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

        try {
            if (message.partial) await message.fetch();
        } catch {
            // Could not load message content.
        }

        const banContext = {
            channelId: message.channelId,
            content: message.content ?? '',
            imageUrl: getDeletedImageUrl(message)
        };

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
