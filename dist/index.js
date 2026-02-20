"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
if (!TELEGRAM_TOKEN || !OPENROUTER_KEY) {
    console.error('❌ Missing env variables');
    process.exit(1);
}
const bot = new telegraf_1.Telegraf(TELEGRAM_TOKEN);
bot.start((ctx) => ctx.reply('🤖 Clawbot is online and ready!'));
bot.on('text', async (ctx) => {
    try {
        await ctx.sendChatAction('typing');
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${OPENROUTER_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-exp:free',
                messages: [
                    { role: 'user', content: ctx.message.text },
                ],
            }),
        });
        if (!res.ok) {
            const err = await res.text();
            console.error('❌ OpenRouter error:', err);
            await ctx.reply('AI service error.');
            return;
        }
        const data = await res.json();
        const reply = data?.choices?.[0]?.message?.content ??
            'AI returned no response.';
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
    console.log('✅ Clawbot running');
});
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
const MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.1-8b-instruct:free'
];
