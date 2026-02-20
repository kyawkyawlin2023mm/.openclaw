import { Telegraf } from 'telegraf';

const tgToken = process.env.TELEGRAM_BOT_TOKEN;
const orKey = process.env.OPENROUTER_API_KEY;

if (!tgToken || !orKey) {
  console.log('Error: API keys are missing in .env file');
} else {
  const bot = new Telegraf(tgToken);

  bot.start((ctx) => ctx.reply('Clawbot is online and ready!'));

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

      const data: any = await response.json();

      // Validate AI Response
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        const replyText = data.choices[0].message.content;
        await ctx.reply(replyText);
      } else {
        // Log error if API fails
        console.error('API Error details:', JSON.stringify(data));
        await ctx.reply('I am online, but the AI service is not responding correctly right now.');
      }
    } catch (error) {
      console.error('Connection Error:', error);
      await ctx.reply('Sorry, I encountered a network error. Please try again.');
    }
  });

  bot.launch()
    .then(() => console.log('Clawbot is successfully running...'))
    .catch((err) => console.error('Launch failed:', err));
}