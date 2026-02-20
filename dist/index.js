"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const dotenv_1 = __importDefault(require("dotenv"));
const node_fetch_1 = __importDefault(require("node-fetch"));
dotenv_1.default.config();
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
if (!TELEGRAM_TOKEN || !OPENROUTER_KEY) {
    console.error('❌ Missing TELEGRAM_BOT_TOKEN or OPENROUTER_API_KEY');
    process.exit(1);
}
const bot = new telegraf_1.Telegraf(TELEGRAM_TOKEN);
bot.start(async (ctx) => {
    await ctx.reply('🤖 Clawbot is online and ready!');
});
bot.on('text', async (ctx) => {
    var _a, _b, _c, _d;
    try {
        await ctx.sendChatAction('typing');
        const res = await (0, node_fetch_1.default)('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${OPENROUTER_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'mistralai/mistral-7b-instruct:free',
                messages: [
                    {
                        role: 'user',
                        content: ctx.message.text,
                    },
                ],
            }),
        });
        if (!res.ok) {
            const err = await res.text();
            console.error('❌ OpenRouter error:', err);
            await ctx.reply('AI service error. Please try again.');
            return;
        }
        const data = await res.json();
        const reply = (_d = (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) !== null && _d !== void 0 ? _d : 'AI did not return a valid response.';
        await ctx.reply(reply);
    }
    catch (err) {
        console.error('❌ Runtime error:', err);
        await ctx.reply('Network error occurred.');
    }
});
bot.catch((err) => {
    console.error('❌ Telegraf error:', err);
});
bot.launch().then(() => {
    console.log('✅ Clawbot successfully running');
});
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
