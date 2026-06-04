const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
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
 * Checks display name, username, global name, and bio — not server tag.
 * @param {import('discord.js').GuildMember} member
 * @param {string} [bio]
 */
const getViolationFields = (member, bio = '') => {
    const { user } = member;
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
    if (member.user.bot) return false;
    if (isDeveloper(member.id)) return false;
    if (member.id === member.guild.ownerId) return false;
    if (!member.moderatable) return false;

    return member.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers);
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
 */
const checkAndQuarantine = async (member, client) => {
    const settings = getSettings();
    if (settings.enabled === false) return;
    if (!settings.flagChannelId) return;

    const key = `${member.guild.id}-${member.id}`;
    if (processing.has(key)) return;

    processing.add(key);

    try {
        if (!canQuarantine(member)) return;

        const bio = await fetchUserBio(client, member.id, member.guild.id);
        const triggeredFields = getViolationFields(member, bio);

        if (!triggeredFields.length) return;

        const timeoutMs = (settings.timeoutDays ?? 7) * 24 * 60 * 60 * 1000;

        await member.timeout(timeoutMs, `Quarantine: "${getKeyword()}" in ${triggeredFields.join(', ')}`);

        const logChannel = await member.guild.channels.fetch(settings.flagChannelId).catch(() => null);
        if (!logChannel?.isTextBased()) return;

        await logChannel.send({ embeds: [createFlagEmbed(member.user, triggeredFields)] });
    } catch {
        // Missing permissions or hierarchy.
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

module.exports = { checkAndQuarantine, scanGuildMembers };
