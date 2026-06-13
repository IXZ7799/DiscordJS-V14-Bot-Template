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
 * @param {string | null | undefined} value
 * @param {string | null | undefined} [fallback]
 */
const displayValue = (value, fallback = null) => {
    if (value != null && value.length > 0) {
        return value.length > 256 ? `${value.slice(0, 253)}...` : value;
    }

    if (fallback != null && fallback.length > 0) {
        return fallback.length > 256 ? `${fallback.slice(0, 253)}...` : fallback;
    }

    return 'None';
};

/**
 * @param {import('discord.js').User} user
 * @param {string | null | undefined} before
 * @param {string | null | undefined} after
 * @param {string | null | undefined} [beforeFallback]
 */
const buildBeforeAfterDescription = (user, before, after, beforeFallback = null) => {
    return `<@${user.id}>\n**Before:** ${displayValue(before, beforeFallback)}\n**After:** ${displayValue(after)}`;
};

/**
 * @param {string} label
 * @param {string | null | undefined} before
 * @param {string | null | undefined} after
 */
const getTextChangeTitle = (label, before, after) => {
    const hadBefore = before != null && before.length > 0;
    const hasAfter = after != null && after.length > 0;

    if (!hadBefore && hasAfter) return `${label} added`;
    if (hadBefore && !hasAfter) return `${label} removed`;

    return `${label} changed`;
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

    return { guild: channel.guild, channel };
};

/**
 * @param {{ channel: import('discord.js').TextBasedChannel }} target
 * @param {import('discord.js').User} user
 * @param {{
 *   title: string,
 *   type: string,
 *   style?: 'avatar' | 'text',
 *   before?: string | null,
 *   after?: string | null,
 *   beforeFallback?: string | null,
 *   thumbnailUrl?: string | null
 * }} change
 */
const sendProfileChangeLog = async (target, user, change) => {
    if (wasRecentlyLogged(user.id, change.type)) return;

    const description = change.style === 'avatar'
        ? `<@${user.id}>`
        : buildBeforeAfterDescription(user, change.before, change.after, change.beforeFallback ?? user.username);

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

module.exports = {
    sendProfileChangeLog,
    getProfileLogTarget,
    getTextChangeTitle,
    avatarUrl,
    guildAvatarUrl
};
