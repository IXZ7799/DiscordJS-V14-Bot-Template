const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const config = require('../config');

const DEFAULT_SESSION_FILES = {
    ny: 'NY Tracker.png',
    asia: 'Asia Tracker.png'
};

const trimmedDigitCache = new Map();

const getTradeCardConfig = () => config.tradeCard ?? {};

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);

const getDigitsDir = () => resolvePath(getTradeCardConfig().digitsPath ?? './assets/trade-card/digits');

const getTradeCardDir = () => resolvePath('./assets/trade-card');

const hasDigitAsset = (char) => fs.existsSync(path.join(getDigitsDir(), `${char}.png`));

const valueHasAllDigitAssets = (value) => String(value).split('').every(hasDigitAsset);

/**
 * @param {string} session
 */
const resolveSessionTemplatePath = (session) => {
    const key = String(session).toLowerCase().trim();
    const settings = getTradeCardConfig();
    const fromConfig = settings.sessions?.[key]?.templatePath;

    if (fromConfig) {
        const resolved = resolvePath(fromConfig);
        if (fs.existsSync(resolved)) return resolved;
    }

    const fallbackFile = DEFAULT_SESSION_FILES[key];
    if (fallbackFile) {
        const resolved = path.join(getTradeCardDir(), fallbackFile);
        if (fs.existsSync(resolved)) return resolved;
    }

    const available = Object.keys(DEFAULT_SESSION_FILES).join(', ');
    throw new Error(`Unknown trade session "${session}". Use: ${available}. Ensure template PNGs are in assets/trade-card/ and config.tradeCard.sessions is set on the host.`);
};

/**
 * @param {string} session
 */
const getSessionSettings = (session) => {
    const key = String(session).toLowerCase().trim();
    const settings = getTradeCardConfig();
    const sessionSettings = settings.sessions?.[key] ?? {};

    return {
        templatePath: resolveSessionTemplatePath(session),
        winsPosition: sessionSettings.winsPosition ?? settings.winsPosition ?? { x: 0.72, y: 0.405 },
        lossesPosition: sessionSettings.lossesPosition ?? settings.lossesPosition ?? { x: 0.72, y: 0.755 },
        numberFontSizeRatio: sessionSettings.numberFontSizeRatio ?? settings.numberFontSizeRatio ?? 0.13,
        digitHeightRatio: sessionSettings.digitHeightRatio ?? settings.digitHeightRatio ?? 0.16,
        numberBackdropColor: sessionSettings.numberBackdropColor ?? settings.numberBackdropColor ?? '#0f0d0c'
    };
};

/**
 * Crops empty/black padding from full-canvas digit exports.
 * @param {string} char
 */
const loadTrimmedDigit = async (char) => {
    if (trimmedDigitCache.has(char)) return trimmedDigitCache.get(char);

    const filePath = path.join(getDigitsDir(), `${char}.png`);
    const img = await loadImage(filePath);
    const w = img.width;
    const h = img.height;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h);

    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a < 24) continue;
            if (r < 40 && g < 40 && b < 40) continue;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    }

    if (maxX < minX || maxY < minY) {
        trimmedDigitCache.set(char, img);
        return img;
    }

    const tw = maxX - minX + 1;
    const th = maxY - minY + 1;
    const trimmed = createCanvas(tw, th);
    const tctx = trimmed.getContext('2d');

    tctx.drawImage(canvas, minX, minY, tw, th, 0, 0, tw, th);
    trimmedDigitCache.set(char, trimmed);

    return trimmed;
};

/**
 * @param {import('@napi-rs/canvas').SKRSContext2D} ctx
 * @param {string} text
 * @param {number} centerX
 * @param {number} centerY
 * @param {number} fontSize
 * @param {string} backdropColor
 */
const drawGlowNumber = (ctx, text, centerX, centerY, fontSize, backdropColor) => {
    const coverW = fontSize * Math.max(2, text.length) * 0.65;
    const coverH = fontSize * 1.1;

    ctx.fillStyle = backdropColor;
    ctx.fillRect(centerX - coverW / 2, centerY - coverH * 0.72, coverW, coverH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;

    ctx.shadowColor = 'rgba(212, 175, 55, 0.95)';
    ctx.shadowBlur = fontSize * 0.35;
    ctx.fillStyle = '#f8ecd4';

    ctx.fillText(text, centerX, centerY);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff8e8';
    ctx.fillText(text, centerX, centerY);
};

/**
 * @param {import('@napi-rs/canvas').SKRSContext2D} ctx
 * @param {number} centerX
 * @param {number} centerY
 * @param {number} digitHeight
 * @param {number} digitCount
 * @param {string} backdropColor
 */
const paintNumberBackdrop = (ctx, centerX, centerY, digitHeight, digitCount, backdropColor) => {
    const coverW = digitHeight * Math.max(1.4, digitCount * 0.72);
    const coverH = digitHeight * 1.15;

    ctx.fillStyle = backdropColor;
    ctx.fillRect(centerX - coverW / 2, centerY - coverH / 2, coverW, coverH);
};

/**
 * @param {import('@napi-rs/canvas').SKRSContext2D} ctx
 * @param {number} value
 * @param {number} centerX
 * @param {number} centerY
 * @param {number} digitHeight
 * @param {string} backdropColor
 */
const drawDigitSprites = async (ctx, value, centerX, centerY, digitHeight, backdropColor) => {
    const chars = String(value).split('');

    paintNumberBackdrop(ctx, centerX, centerY, digitHeight, chars.length, backdropColor);

    const images = await Promise.all(chars.map((c) => loadTrimmedDigit(c)));

    const scaledWidths = images.map((img) => (img.width / img.height) * digitHeight);
    const totalWidth = scaledWidths.reduce((a, b) => a + b, 0);
    let x = centerX - totalWidth / 2;

    for (let i = 0; i < images.length; i++) {
        const w = scaledWidths[i];
        ctx.drawImage(images[i], x, centerY - digitHeight / 2, w, digitHeight);
        x += w;
    }
};

/**
 * @param {import('@napi-rs/canvas').SKRSContext2D} ctx
 * @param {number} value
 * @param {number} centerX
 * @param {number} centerY
 * @param {number} digitHeight
 * @param {number} fontSize
 * @param {string} backdropColor
 */
const drawValue = async (ctx, value, centerX, centerY, digitHeight, fontSize, backdropColor) => {
    if (valueHasAllDigitAssets(value)) {
        await drawDigitSprites(ctx, value, centerX, centerY, digitHeight, backdropColor);
        return;
    }

    drawGlowNumber(ctx, String(value), centerX, centerY, fontSize, backdropColor);
};

/**
 * @param {string} session
 * @param {number} wins
 * @param {number} losses
 * @returns {Promise<Buffer>}
 */
const generateTradeCard = async (session, wins, losses) => {
    const sessionSettings = getSessionSettings(session);
    const template = await loadImage(sessionSettings.templatePath);
    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(template, 0, 0);

    const fontSize = Math.round(template.height * sessionSettings.numberFontSizeRatio);
    const digitHeight = Math.round(template.height * sessionSettings.digitHeightRatio);

    const winsX = template.width * sessionSettings.winsPosition.x;
    const winsY = template.height * sessionSettings.winsPosition.y;
    const lossesX = template.width * sessionSettings.lossesPosition.x;
    const lossesY = template.height * sessionSettings.lossesPosition.y;

    const backdrop = sessionSettings.numberBackdropColor;

    await drawValue(ctx, wins, winsX, winsY, digitHeight, fontSize, backdrop);
    await drawValue(ctx, losses, lossesX, lossesY, digitHeight, fontSize, backdrop);

    return canvas.toBuffer('image/png');
};

module.exports = generateTradeCard;
