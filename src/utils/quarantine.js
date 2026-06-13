const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { warn, info, error } = require('./Console');
const { isDeveloper } = require('./isDeveloper');

const processing = new Set();

const getSettings = () => config.quarantine ?? {};

const getKeyword = () => (getSettings().keyword ?? 'vani').toLowerCase();

const containsKeyword = (text) => {
    if (!text || typeof text !== 'string') return false;
    return text.toLowerCase().includes(getKeyword());
};

/**
 * @param {import('discord.js').Client} client
 * @param {string} userId
 * @param {string} guildId
 */
const fetchUserBio = async (client, userId, guildId) => {
    try {
        const profile = await client.rest.get(
            `/users/${userId}/profile?guild_id=${guildId}&with_mutual_guilds=false&with_mutual_friends_count=false`
        );

        return profile?.user?.bio ?? profile?.user_profile?.bio ?? '';
    } catch {
        return '';
    }
};

/**
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').User} [user]
 * @param {string} [bio]
 */
const getViolationFields = (member, user = member.user, bio = '') => {
    const triggered = [];

    if (containsKeyword(user.username)) triggered.push('Username');
    if (containsKeyword(user.globalName)) triggered.push('Global name');
    if (member.nickname && containsKeyword(member.nickname)) triggered.push('Nickname');
    if (containsKeyword(bio)) triggered.push('Bio');

    return triggered;
};

/**
 * @param {import('discord.js').GuildMember} member
 * @param {{ quiet?: boolean }} [options]
 */
const canQuarantine = (member, options = {}) => {
    const { quiet = false } = options;

    if (member.user.bot) {
        if (!quiet) info(`[Quarantine] Skipped ${member.id}: bot account`);
        return false;
    }

    if (isDeveloper(member.id)) {
        if (!quiet) info(`[Quarantine] Skipped ${member.id}: developer exempt`);
        return false;
    }

    if (member.id === member.guild.ownerId) {
        if (!quiet) info(`[Quarantine] Skipped ${member.id}: guild owner`);
        return false;
    }

    if (!member.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        if (!quiet) warn(`[Quarantine] Skipped ${member.id}: bot lacks Moderate Members in ${member.guild.name}`);
        return false;
    }

    if (!member.moderatable) {
        if (!quiet) warn(`[Quarantine] Skipped ${member.id}: not moderatable (role hierarchy) in ${member.guild.name}`);
        return false;
    }

    return true;
};

/**
 * @param {import('discord.js').User} user
 * @param {string[]} triggeredFields
 */
const createFlagEmbed = (user, triggeredFields) => {
    const avatarURL = user.displayAvatarURL({ size: 4096 });

    return new EmbedBuilder()
        .setAuthor({
            name: 'Member Quarantined',
            iconURL: avatarURL
        })
        .setDescription(`<@${user.id}> ${user.username}`)
        .addFields(
            { name: 'Triggered in', value: triggeredFields.join(', '), inline: false },
            { name: 'Action', value: `${getSettings().timeoutDays ?? 7} day timeout`, inline: true }
        )
        .setColor(0x9B59B6)
        .setThumbnail(avatarURL)
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp();
};

/**
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').User} [user]
 * @param {{ quiet?: boolean }} [options]
 * @returns {Promise<'quarantined' | 'clean' | 'skipped'>}
 */
const checkAndQuarantine = async (member, client, user = member.user, options = {}) => {
    const { quiet = false } = options;
    const settings = getSettings();

    if (settings.enabled === false) {
        if (!quiet) info('[Quarantine] Disabled in config');
        return 'skipped';
    }

    if (!settings.flagChannelId) {
        if (!quiet) warn('[Quarantine] No flagChannelId in config');
        return 'skipped';
    }

    const key = `${member.guild.id}-${member.id}`;
    if (processing.has(key)) return 'skipped';

    processing.add(key);

    try {
        if (!canQuarantine(member, { quiet })) return 'skipped';

        const bio = await fetchUserBio(client, member.id, member.guild.id);
        const triggeredFields = getViolationFields(member, user, bio);

        if (!quiet) {
            info(`[Quarantine] Checked ${user.tag} (${user.id}) in ${member.guild.name} — username: "${user.username}", globalName: "${user.globalName ?? ''}", nickname: "${member.nickname ?? ''}", triggered: [${triggeredFields.join(', ')}]`);
        }

        if (!triggeredFields.length) return 'clean';

        const timeoutMs = (settings.timeoutDays ?? 7) * 24 * 60 * 60 * 1000;

        await member.timeout(timeoutMs, `Quarantine: "${getKeyword()}" in ${triggeredFields.join(', ')}`);

        if (!quiet) info(`[Quarantine] Timed out ${user.tag} for ${settings.timeoutDays ?? 7} days`);

        const logChannel = await member.guild.channels.fetch(settings.flagChannelId).catch(() => null);
        if (!logChannel?.isTextBased()) {
            if (!quiet) warn(`[Quarantine] Flag channel ${settings.flagChannelId} not found or not text-based`);
            return 'quarantined';
        }

        await logChannel.send({ embeds: [createFlagEmbed(user, triggeredFields)] });

        if (!quiet) info(`[Quarantine] Sent flag embed for ${user.id}`);

        return 'quarantined';
    } catch (err) {
        if (!quiet) error(`[Quarantine] Failed for ${member.id}:`, err.message);
        return 'skipped';
    } finally {
        processing.delete(key);
    }
};

/**
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} client
 * @param {(current: number, total: number) => Promise<void> | void} [onProgress]
 */
const runGuildQuarantineCheck = async (guild, client, onProgress) => {
    await guild.members.fetch().catch(() => null);

    const members = [...guild.members.cache.values()].filter((member) => !member.user.bot);
    const total = members.length;
    let quarantined = 0;

    for (let index = 0; index < members.length; index++) {
        const member = members[index];
        const current = index + 1;

        if (onProgress) await onProgress(current, total);

        const result = await checkAndQuarantine(member, client, member.user, { quiet: true });
        if (result === 'quarantined') quarantined++;
    }

    return { checked: total, quarantined, keyword: getKeyword() };
};

/**
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').User} user
 */
const checkUserInAllGuilds = async (client, user) => {
    for (const guild of client.guilds.cache.values()) {
        const member = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
        if (!member) continue;

        await checkAndQuarantine(member, client, user);
    }
};

module.exports = {
    checkAndQuarantine,
    runGuildQuarantineCheck,
    checkUserInAllGuilds,
    getKeyword
};
