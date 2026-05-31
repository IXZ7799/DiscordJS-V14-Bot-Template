const { PermissionsBitField } = require('discord.js');

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

const getStartOfTodayUtc = () => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    return start.getTime();
};

/**
 * @param {import('discord.js').TextBasedChannel} channel
 * @param {string} userId
 * @param {number} sinceTimestamp
 */
const collectUserMessagesFromToday = async (channel, userId, sinceTimestamp) => {
    const collected = [];
    let before;

    while (true) {
        const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
        if (!batch?.size) break;

        let reachedOlder = false;

        for (const msg of batch.values()) {
            if (msg.createdTimestamp < sinceTimestamp) {
                reachedOlder = true;
                break;
            }

            if (msg.author.id === userId) collected.push(msg);
        }

        if (reachedOlder || batch.size < 100) break;

        before = batch.last().id;
    }

    return collected;
};

/**
 * @param {import('discord.js').Message[]} messages
 */
const deleteMessages = async (messages) => {
    const now = Date.now();
    const deletable = messages.filter((m) => now - m.createdTimestamp < TWO_WEEKS_MS);
    if (!deletable.length) return;

    for (let i = 0; i < deletable.length; i += 100) {
        const chunk = deletable.slice(i, i + 100);

        try {
            if (chunk.length === 1) {
                await chunk[0].delete();
            } else {
                await chunk[0].channel.bulkDelete(chunk, true);
            }
        } catch {
            for (const msg of chunk) {
                await msg.delete().catch(() => null);
            }
        }
    }
};

/**
 * Deletes all of a user's messages sent today (UTC) across the guild.
 * @param {import('discord.js').Guild} guild
 * @param {string} userId
 */
async function deleteUserMessagesToday(guild, userId) {
    const sinceTimestamp = getStartOfTodayUtc();
    const me = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
    if (!me) return;

    const required = PermissionsBitField.Flags.ViewChannel
        | PermissionsBitField.Flags.ReadMessageHistory
        | PermissionsBitField.Flags.ManageMessages;

    const channels = guild.channels.cache.filter((channel) => {
        if (!channel.isTextBased() || channel.isDMBased()) return false;
        return me.permissionsIn(channel).has(required);
    });

    for (const channel of channels.values()) {
        const messages = await collectUserMessagesFromToday(channel, userId, sinceTimestamp);
        await deleteMessages(messages);
    }
}

module.exports = deleteUserMessagesToday;
