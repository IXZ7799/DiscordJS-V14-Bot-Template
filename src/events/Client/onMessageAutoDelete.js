const { EmbedBuilder } = require("discord.js");
const Event = require("../../structure/Event");
const config = require("../../config");

/** @param {import('discord.js').User} user */
const createBanEmbed = (user) => {
    const avatarURL = user.displayAvatarURL({ size: 4096 });

    return new EmbedBuilder()
        .setAuthor({
            name: 'Member Banned',
            iconURL: avatarURL
        })
        .setDescription(`<@${user.id}> ${user.username} banned for posting in <#1510353603653795980>.`)
        .setColor(0xEE7026)
        .setThumbnail(avatarURL)
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp();
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
            await message.delete();
        } catch {
            // Missing permissions, message already deleted, or too old to delete.
        }

        try {
            const member = message.member ?? await guild.members.fetch(author.id).catch(() => null);

            if (member && !member.bannable) return;

            await guild.members.ban(author.id, {
                reason: 'Auto-ban: sent a message in a restricted channel'
            });

            const logChannelId = config.moderation?.banLogChannelId;
            if (!logChannelId) return;

            const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
            if (!logChannel?.isTextBased()) return;

            await logChannel.send({ embeds: [createBanEmbed(author)] });
        } catch {
            // Missing permissions, user already banned, or role hierarchy blocks ban.
        }
    }
}).toJSON();
