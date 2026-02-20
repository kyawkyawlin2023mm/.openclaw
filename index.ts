import { Telegraf } from 'telegraf';
import { GoogleGenerativeAI } from '@google/generative-ai';

const tgToken = process.env.TELEGRAM_BOT_TOKEN;
const aiKey = process.env.GEMINI_API_KEY;

if (!tgToken || !aiKey) {
  console.log('Error: Tokens are missing in .env file');
} else {
  const bot = new Telegraf(tgToken);
  const genAI = new GoogleGenerativeAI(aiKey);
  
  // Try using 'gemini-pro' which is very stable
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  bot.start((ctx) => {
    ctx.reply('Welcome! I am your AI assistant. Ask me anything.');
  });

  bot.on('text', async (ctx) => {
    try {
      await ctx.sendChatAction('typing');
      const result = await model.generateContent(ctx.message.text);
      const response = await result.response;
      const text = response.text();
      await ctx.reply(text);
    } catch (error) {
      console.error('AI Error:', error);
      ctx.reply('I am having trouble processing your request.');
    }
  });

  bot.launch()
    .then(() => console.log('AI Bot is successfully running...'))
    .catch((err) => console.error('Launch error:', err));
}