const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const PROFILE_COLOR = 0x5865F2;

/**
 * @param {import('discord.js').User} user
 * @param {string | null} hash
 */
const avatarUrl = (user, hash) => {
    if (!hash) return user.displayAvatarURL({ size: 4096 });

    const extension = hash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${hash}.${extension}?size=4096`;
};

/**
 * @param {import('discord.js').GuildMember} member
 * @param {string | null} hash
 */
const guildAvatarUrl = (member, hash) => {
    if (!hash) return null;

    const extension = hash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/guilds/${member.guild.id}/users/${member.id}/avatars/${hash}.${extension}?size=4096`;
};

/**
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').User} user
 * @param {{ title: string, thumbnailUrl?: string | null, detail?: string | null }} change
 */
const sendProfileChangeLog = async (guild, user, change) => {
    const logChannelId = config.profileWatch?.logChannelId;
    if (!logChannelId) return;

    const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel?.isTextBased()) return;

    const description = change.detail
        ? `<@${user.id}>\n${change.detail}`
        : `<@${user.id}>`;

    const embed = new EmbedBuilder()
        .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ size: 1024 })
        })
        .setTitle(change.title)
        .setDescription(description)
        .setColor(PROFILE_COLOR)
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp();

    if (change.thumbnailUrl) {
        embed.setThumbnail(change.thumbnailUrl);
    }

    await logChannel.send({ embeds: [embed] });
};

/**
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 */
const getLogGuild = async (client, guildId) => {
    const logChannelId = config.profileWatch?.logChannelId;
    if (!logChannelId) return null;

    const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel?.isTextBased() || !logChannel.guild) return null;
    if (logChannel.guild.id !== guildId) return null;

    return logChannel.guild;
};

/**
 * @param {string | null | undefined} value
 */
const formatNewValue = (value) => {
    if (!value?.length) return '*None*';
    return `**${value.length > 256 ? `${value.slice(0, 253)}...` : value}**`;
};

module.exports = {
    sendProfileChangeLog,
    getLogGuild,
    formatNewValue,
    avatarUrl,
    guildAvatarUrl
};
