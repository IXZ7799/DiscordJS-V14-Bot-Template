const config = require('../config');

/**
 * @param {string} userId
 */
const isDeveloper = (userId) => {
    if (userId === config.users.ownerId) return true;
    return config.users.developers?.includes(userId) ?? false;
};

const getDeveloperIds = () => {
    return [...new Set([config.users.ownerId, ...(config.users.developers ?? [])])];
};

module.exports = { isDeveloper, getDeveloperIds };
