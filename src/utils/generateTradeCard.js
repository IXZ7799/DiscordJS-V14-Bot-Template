const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const config = require('../config');

const getTradeCardConfig = () => config.tradeCard ?? {};

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);

const getDigitsDir = () => resolvePath(getTradeCardConfig().digitsPath ?? './assets/trade-card/digits');

const hasDigitAsset = (char) => fs.existsSync(path.join(getDigitsDir(), `${char}.png`));

const valueHasAllDigitAssets = (value) => String(value).split('').every(hasDigitAsset);

/**
 * @param {string} session
 */
const getSessionSettings = (session) => {
    const settings = getTradeCardConfig();
    const sessions = settings.sessions ?? {};
    const sessionSettings = sessions[session];

    if (!sessionSettings?.templatePath) {
        throw new Error(`Unknown trade session "${session}". Use ny or asia.`);
    }

    return {
        templatePath: resolvePath(sessionSettings.templatePath),
        winsPosition: sessionSettings.winsPosition ?? settings.winsPosition ?? { x: 0.72, y: 0.405 },
        lossesPosition: sessionSettings.lossesPosition ?? settings.lossesPosition ?? { x: 0.72, y: 0.755 },
        numberFontSizeRatio: sessionSettings.numberFontSizeRatio ?? settings.numberFontSizeRatio ?? 0.13,
        digitHeightRatio: sessionSettings.digitHeightRatio ?? settings.digitHeightRatio ?? 0.11,
        numberBackdropColor: sessionSettings.numberBackdropColor ?? settings.numberBackdropColor ?? '#0f0d0c'
    };
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
    const digitsDir = getDigitsDir();
    const chars = String(value).split('');

    paintNumberBackdrop(ctx, centerX, centerY, digitHeight, chars.length, backdropColor);

    const images = await Promise.all(chars.map((c) => loadImage(path.join(digitsDir, `${c}.png`))));

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
 * @param {string} session
 * @param {number} wins
 * @param {number} losses
 * @returns {Promise<Buffer>}
 */
const generateTradeCard = async (session, wins, losses) => {
    const sessionSettings = getSessionSettings(session);

    if (!fs.existsSync(sessionSettings.templatePath)) {
        throw new Error('Trade card template not found at ' + sessionSettings.templatePath);
    }

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

    const winsText = String(wins);
    const lossesText = String(losses);
    const backdrop = sessionSettings.numberBackdropColor;

    if (valueHasAllDigitAssets(wins)) {
        await drawDigitSprites(ctx, wins, winsX, winsY, digitHeight, backdrop);
    } else {
        drawGlowNumber(ctx, winsText, winsX, winsY, fontSize, backdrop);
    }

    if (valueHasAllDigitAssets(losses)) {
        await drawDigitSprites(ctx, losses, lossesX, lossesY, digitHeight, backdrop);
    } else {
        drawGlowNumber(ctx, lossesText, lossesX, lossesY, fontSize, backdrop);
    }

    return canvas.toBuffer('image/png');
};

module.exports = generateTradeCard;
