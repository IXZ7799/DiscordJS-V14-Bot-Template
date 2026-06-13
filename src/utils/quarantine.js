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
 */
const canQuarantine = (member) => {
    if (member.user.bot) {
        info(`[Quarantine] Skipped ${member.id}: bot account`);
        return false;
    }

    if (isDeveloper(member.id)) {
        info(`[Quarantine] Skipped ${member.id}: developer exempt`);
        return false;
    }

    if (member.id === member.guild.ownerId) {
        info(`[Quarantine] Skipped ${member.id}: guild owner`);
        return false;
    }

    if (!member.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        warn(`[Quarantine] Skipped ${member.id}: bot lacks Moderate Members in ${member.guild.name}`);
        return false;
    }

    if (!member.moderatable) {
        warn(`[Quarantine] Skipped ${member.id}: not moderatable (role hierarchy) in ${member.guild.name}`);
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
 */
const checkAndQuarantine = async (member, client, user = member.user) => {
    const settings = getSettings();

    if (settings.enabled === false) {
        info('[Quarantine] Disabled in config');
        return;
    }

    if (!settings.flagChannelId) {
        warn('[Quarantine] No flagChannelId in config');
        return;
    }

    const key = `${member.guild.id}-${member.id}`;
    if (processing.has(key)) return;

    processing.add(key);

    try {
        if (!canQuarantine(member)) return;

        const bio = await fetchUserBio(client, member.id, member.guild.id);
        const triggeredFields = getViolationFields(member, user, bio);

        info(`[Quarantine] Checked ${user.tag} (${user.id}) in ${member.guild.name} — username: "${user.username}", globalName: "${user.globalName ?? ''}", nickname: "${member.nickname ?? ''}", triggered: [${triggeredFields.join(', ')}]`);

        if (!triggeredFields.length) return;

        const timeoutMs = (settings.timeoutDays ?? 7) * 24 * 60 * 60 * 1000;

        await member.timeout(timeoutMs, `Quarantine: "${getKeyword()}" in ${triggeredFields.join(', ')}`);
        info(`[Quarantine] Timed out ${user.tag} for ${settings.timeoutDays ?? 7} days`);

        const logChannel = await member.guild.channels.fetch(settings.flagChannelId).catch(() => null);
        if (!logChannel?.isTextBased()) {
            warn(`[Quarantine] Flag channel ${settings.flagChannelId} not found or not text-based`);
            return;
        }

        await logChannel.send({ embeds: [createFlagEmbed(user, triggeredFields)] });
        info(`[Quarantine] Sent flag embed for ${user.id}`);
    } catch (err) {
        error(`[Quarantine] Failed for ${member.id}:`, err.message);
    } finally {
        processing.delete(key);
    }
};

/**
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild} guild
 */
const scanGuildMembers = async (client, guild) => {
    await guild.members.fetch().catch(() => null);

    for (const member of guild.members.cache.values()) {
        await checkAndQuarantine(member, client);
    }
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

module.exports = { checkAndQuarantine, scanGuildMembers, checkUserInAllGuilds };
