const fs = require('fs');
const path = require('path');
const config = require('../config');

const filePath = path.resolve(config.highlights?.path ?? './highlights.json');

const normalizeWord = (word) => word.trim().toLowerCase();

const readStore = () => {
    try {
        if (!fs.existsSync(filePath)) return {};
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return typeof data === 'object' && data !== null ? data : {};
    } catch {
        return {};
    }
};

const writeStore = (data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

/**
 * Case-insensitive check whether message content contains a highlight word.
 * @param {string} content
 * @param {string} word stored lowercase
 */
const contentIncludesWord = (content, word) => {
    return content.toLowerCase().includes(word);
};

/**
 * @param {string} userId
 */
const getWords = (userId) => {
    const store = readStore();
    return Array.isArray(store[userId]) ? store[userId] : [];
};

/**
 * @param {string} userId
 * @param {string} word
 */
const addWord = (userId, word) => {
    const normalized = normalizeWord(word);
    const store = readStore();
    const words = getWords(userId);

    if (words.includes(normalized)) {
        return { ok: false, reason: 'already_exists', words };
    }

    const max = config.highlights?.maxPerUser ?? 50;

    if (words.length >= max) {
        return { ok: false, reason: 'limit_reached', words };
    }

    store[userId] = [...words, normalized];
    writeStore(store);

    return { ok: true, words: store[userId] };
};

/**
 * @param {string} userId
 * @param {string} word
 */
const removeWord = (userId, word) => {
    const normalized = normalizeWord(word);
    const store = readStore();
    const words = getWords(userId);

    if (!words.includes(normalized)) {
        return { ok: false, reason: 'not_found', words };
    }

    store[userId] = words.filter((w) => w !== normalized);
    writeStore(store);

    return { ok: true, words: store[userId] };
};

/**
 * @returns {Map<string, string[]>}
 */
const getAllHighlightSubscriptions = () => {
    const store = readStore();
    const map = new Map();

    for (const [userId, words] of Object.entries(store)) {
        if (!Array.isArray(words) || !words.length) continue;
        map.set(userId, words.map(normalizeWord));
    }

    return map;
};

module.exports = {
    getWords,
    addWord,
    removeWord,
    getAllHighlightSubscriptions,
    contentIncludesWord,
    normalizeWord
};
