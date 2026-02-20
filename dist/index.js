"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/* ============================
   ENV VALIDATION
============================ */
const { TELEGRAM_BOT_TOKEN, GEMINI_API_KEY } = process.env;
if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN');
}
if (!GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY');
}
/* ============================
   INIT SERVICES
============================ */
const bot = new telegraf_1.Telegraf(TELEGRAM_BOT_TOKEN);
const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
});
const userMemory = new Map();
const MAX_HISTORY = 10;
/* ============================
   UTILS
============================ */
// Telegram message limit fix
const splitMessage = (text, limit = 4096) => {
    const chunks = [];
    for (let i = 0; i < text.length; i += limit) {
        chunks.push(text.slice(i, i + limit));
    }
    return chunks;
};
/* ============================
   BOT COMMANDS
============================ */
bot.start(async (ctx) => {
    await ctx.reply('👋 Welcome!\n\nI am powered by Gemini 1.5 Flash.\nSend me a message!');
});
bot.command('reset', async (ctx) => {
    if (ctx.from) {
        userMemory.delete(ctx.from.id);
    }
    await ctx.reply('🧹 Conversation memory cleared.');
});
/* ============================
   MAIN TEXT HANDLER
============================ */
bot.on('text', async (ctx) => {
    if (!ctx.from)
        return;
    const userId = ctx.from.id;
    const userMessage = ctx.message.text.trim();
    if (!userMessage)
        return;
    try {
        await ctx.sendChatAction('typing');
        // Load or create history
        const history = userMemory.get(userId) || [];
        // Add user message
        history.push({
            role: 'user',
            parts: [{ text: userMessage }],
        });
        // Trim old history
        if (history.length > MAX_HISTORY) {
            history.splice(0, history.length - MAX_HISTORY);
        }
        const chat = model.startChat({
            history,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
            },
        });
        // Streaming response
        const result = await chat.sendMessageStream(userMessage);
        let fullResponse = '';
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
        }
        // Save model response to memory
        history.push({
            role: 'model',
            parts: [{ text: fullResponse }],
        });
        userMemory.set(userId, history);
        // Split if too long
        const messages = splitMessage(fullResponse);
        for (const msg of messages) {
            await ctx.reply(msg);
        }
    }
    catch (error) {
        console.error('AI Error:', error);
        await ctx.reply('❌ Error processing your request. Try again.');
    }
});
/* ============================
   GRACEFUL SHUTDOWN
============================ */
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
/* ============================
   LAUNCH
============================ */
bot.launch()
    .then(() => console.log('🚀 Advanced AI Bot Running...'))
    .catch((err) => console.error('Launch Error:', err));
