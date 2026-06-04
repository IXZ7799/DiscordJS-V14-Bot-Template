const Event = require("../../structure/Event");
const { getAllHighlightSubscriptions } = require("../../utils/highlights");
const { sendHighlightDm } = require("../../utils/highlightNotify");
module.exports = new Event({
    event: 'messageCreate',
    once: false,
    run: async (client, message) => {
        if (!message.guild) return;
        if (message.author.bot) return;
        if (!message.content?.length) return;

        const content = message.content.toLowerCase();
        const subscriptions = getAllHighlightSubscriptions();

        for (const [userId, words] of subscriptions) {
            if (message.author.id === userId) continue;

            for (const word of words) {
                if (!content.includes(word)) continue;

                try {
                    await sendHighlightDm(message, word, userId);
                } catch {
                    // DMs closed or blocked.
                }

                break;
            }
        }
    }
}).toJSON();
