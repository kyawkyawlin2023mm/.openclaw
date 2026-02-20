import { Telegraf } from 'telegraf';

// Fetching the Token from the .env file
const token = process.env.TELEGRAM_BOT_TOKEN; 

if (!token) {
  console.log('Error: TELEGRAM_BOT_TOKEN is missing in your .env file.');
} else {
  const bot = new Telegraf(token);

  // Command for /start
  bot.start((ctx) => ctx.reply('Welcome! I am your Clawbot. How can I help you today?'));

  // Reply to any incoming text message
  bot.on('text', (ctx) => {
    ctx.reply(You said: ${ctx.message.text});
  });

  // Launch the bot
  bot.launch();
  console.log('Telegram Bot is successfully running...');
}