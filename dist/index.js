"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const tgToken = process.env.TELEGRAM_BOT_TOKEN;
const orKey = process.env.OPENROUTER_API_KEY;
if (!tgToken || !orKey) {
    console.log('Error: Tokens are missing');
}
else {
    const bot = new telegraf_1.Telegraf(tgToken);
    bot.start((ctx) => ctx.reply('Clawbot is ready! (OpenRouter version)'));
    bot.on('text', async (ctx) => {
        try {
            await ctx.sendChatAction('typing');
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + orKey,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "google/gemini-2.0-flash-exp:free",
                    "messages": [{ "role": "user", "content": ctx.message.text }]
                })
            });
            const data = await response.json();
            const replyText = data.choices[0].message.content;
            await ctx.reply(replyText);
        }
        catch (error) {
            console.error('AI Error:', error);
            ctx.reply('I am having trouble with the AI service.');
        }
    });
    bot.launch().then(() => console.log('Bot is running...'));
}
