import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

if (!TELEGRAM_TOKEN || !OPENROUTER_KEY) {
  console.error('❌ Missing env variables');
  process.exit(1);
}

const bot = new Telegraf(TELEGRAM_TOKEN);

bot.start((ctx) => ctx.reply('🤖 Clawbot is online (GPT-4o mini)'));

bot.on('text', async (ctx) => {
  try {
    await ctx.sendChatAction('typing');

    const res = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are Clawbot, a helpful AI assistant.',
            },
            {
              role: 'user',
              content: ctx.message.text,
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('❌ OpenRouter error:', err);
      await ctx.reply('AI service error. Try again later.');
      return;
    }

    const data: any = await res.json();
    const reply =
      data?.choices?.[0]?.message?.content ??
      'No response from AI.';

    await ctx.reply(reply);
  } catch (err) {
    console.error('❌ Runtime error:', err);
    await ctx.reply('Network error occurred.');
  }
});

bot.catch((err) => {
  console.error('❌ Telegraf error:', err);
});

bot.launch().then(() => {
  console.log('✅ Clawbot running with GPT-4o mini');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));