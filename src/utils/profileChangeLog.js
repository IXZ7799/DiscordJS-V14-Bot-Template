const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { info, warn, error } = require('./Console');

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

    if (expires && expires > Date.now()) {
        info(`[ProfileWatch] Skipped duplicate ${type} log for ${userId}`);
        return true;
    }

    recentLogs.set(key, Date.now() + 5000);
    return false;
};

/**
 * @param {import('discord.js').Client} client
 */
const getProfileLogTarget = async (client) => {
    const logChannelId = config.profileWatch?.logChannelId;

    if (!logChannelId) {
        warn('[ProfileWatch] No logChannelId in config.profileWatch');
        return null;
    }

    const channel = await client.channels.fetch(logChannelId).catch((err) => {
        error('[ProfileWatch] Failed to fetch log channel:', err.message);
        return null;
    });

    if (!channel?.isTextBased() || !channel.guild) {
        warn('[ProfileWatch] Log channel missing, not text-based, or has no guild:', logChannelId);
        return null;
    }

    info(`[ProfileWatch] Log target ready: #${channel.name} in ${channel.guild.name}`);
    return { guild: channel.guild, channel };
};

/**
 * @param {import('discord.js').Guild} guild
 * @param {string} userId
 */
const isMemberInGuild = async (guild, userId) => {
    if (guild.members.cache.has(userId)) {
        info(`[ProfileWatch] User ${userId} found in ${guild.name} member cache`);
        return true;
    }

    const member = await guild.members.fetch({ user: userId, force: false }).catch((err) => {
        warn(`[ProfileWatch] Member fetch failed for ${userId} in ${guild.name}:`, err.message);
        return null;
    });

    if (member) {
        info(`[ProfileWatch] User ${userId} fetched in ${guild.name}`);
        return true;
    }

    warn(`[ProfileWatch] User ${userId} is not a member of ${guild.name}`);
    return false;
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

    try {
        await target.channel.send({ embeds: [embed] });
        info(`[ProfileWatch] Sent "${change.title}" for ${user.tag} (${user.id})`);
    } catch (err) {
        error(`[ProfileWatch] Failed to send "${change.title}" for ${user.id}:`, err.message);
    }
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
