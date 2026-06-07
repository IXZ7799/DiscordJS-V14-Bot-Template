const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const PROFILE_COLOR = 0x5865F2;

/**
 * @param {string | null | undefined} value
 */
const formatText = (value) => {
    if (!value?.length) return '*None*';
    return value.length > 1024 ? `${value.slice(0, 1021)}...` : value;
};

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
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').User} user
 * @param {{ name: string, value: string }[]} fields
 * @param {string | null} [thumbnailUrl]
 */
const sendProfileChangeLog = async (client, guild, user, fields, thumbnailUrl = null) => {
    const logChannelId = config.profileWatch?.logChannelId;
    if (!logChannelId || !fields.length) return;

    const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
        .setAuthor({
            name: 'Profile Updated',
            iconURL: user.displayAvatarURL({ size: 1024 })
        })
        .setDescription(`<@${user.id}> ${user.username}`)
        .setColor(PROFILE_COLOR)
        .addFields(fields)
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp();

    if (thumbnailUrl) {
        embed.setThumbnail(thumbnailUrl);
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

module.exports = {
    sendProfileChangeLog,
    getLogGuild,
    formatText,
    avatarUrl,
    guildAvatarUrl
};
