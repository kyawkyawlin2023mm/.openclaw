"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const generative_ai_1 = require("@google/generative-ai");
const tgToken = process.env.TELEGRAM_BOT_TOKEN;
const aiKey = process.env.GEMINI_API_KEY;
if (!tgToken || !aiKey) {
    console.log('Error: Tokens are missing in .env file');
}
else {
    const bot = new telegraf_1.Telegraf(tgToken);
    const genAI = new generative_ai_1.GoogleGenerativeAI(aiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    bot.start((ctx) => ctx.reply('Hello! I am Clawbot powered by Gemini AI. Ask me anything!'));
    bot.on('text', async (ctx) => {
        try {
            // Show "typing..." status in Telegram
            await ctx.sendChatAction('typing');
            const result = await model.generateContent(ctx.message.text);
            const response = await result.response;
            ctx.reply(response.text());
        }
        catch (error) {
            console.error(error);
            ctx.reply('Sorry, I am having trouble thinking right now.');
        }
    });
    bot.launch().then(() => console.log('AI Bot is running...'));
}
