import { Telegraf } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN; 

if (!token) {
  console.log('Error: TELEGRAM_BOT_TOKEN is missing');
} else {
  const bot = new Telegraf(token);

  bot.start((ctx) => ctx.reply('Welcome! I am your Clawbot.'));

  bot.on('text', (ctx) => {
    ctx.reply(`You said: ${ctx.message.text}`);
  });

  bot.launch();
  console.log('Telegram Bot is successfully running...');
}