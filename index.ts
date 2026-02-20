import { Telegraf } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.log('Error: TELEGRAM_BOT_TOKEN is missing');
} else {
  const bot = new Telegraf(token);

  bot.start((ctx) => {
    ctx.reply('Bot started successfully');
  });

  bot.on('text', (ctx) => {
    ctx.reply('Message received: ' + ctx.message.text);
  });

  bot.launch()
    .then(() => console.log('Telegram Bot is running'))
    .catch((err) => console.error(err));
}