const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const PROFILE_COLOR = 0x5865F2;
const recentLogs = new Map();

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
 * @param {string} userId
 * @param {string} type
 */
const wasRecentlyLogged = (userId, type) => {
    const key = `${userId}:${type}`;
    const expires = recentLogs.get(key);

    if (expires && expires > Date.now()) return true;

    recentLogs.set(key, Date.now() + 5000);
    return false;
};

/**
 * @param {import('discord.js').Client} client
 */
const getProfileLogTarget = async (client) => {
    const logChannelId = config.profileWatch?.logChannelId;
    if (!logChannelId) return null;

    const channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!channel?.isTextBased() || !channel.guild) return null;

    return { guild: channel.guild, channel };
};

/**
 * @param {import('discord.js').Guild} guild
 * @param {string} userId
 */
const isMemberInGuild = async (guild, userId) => {
    if (guild.members.cache.has(userId)) return true;

    const member = await guild.members.fetch({ user: userId, force: false }).catch(() => null);
    return Boolean(member);
};

/**
 * @param {{ channel: import('discord.js').TextBasedChannel }} target
 * @param {import('discord.js').User} user
 * @param {{ title: string, thumbnailUrl?: string | null, detail?: string | null, type: string }} change
 */
const sendProfileChangeLog = async (target, user, change) => {
    if (wasRecentlyLogged(user.id, change.type)) return;

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

    await target.channel.send({ embeds: [embed] });
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
    getProfileLogTarget,
    isMemberInGuild,
    formatNewValue,
    avatarUrl,
    guildAvatarUrl
};
