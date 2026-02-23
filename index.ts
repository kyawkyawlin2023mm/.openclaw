import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import { handleMission } from "./missionControl";
import { handleContentCommand } from "./contentFactory";
import { handleCalendarCommand } from "./calendarFactory";

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

if (!TELEGRAM_TOKEN || !OPENROUTER_KEY) {
  console.error("❌ Missing env variables");
  process.exit(1);
}

const bot = new Telegraf(TELEGRAM_TOKEN);

bot.start((ctx) => ctx.reply("🤖 Clawbot is online (Multi-Agent Mode)"));

bot.on("text", async (ctx) => {
  try {
    await ctx.sendChatAction("typing");

    const text = ctx.message.text.trim();

    let reply: string;

  if (text.startsWith("/content")) {
  reply = await handleContentCommand(text);
} else if (text.startsWith("/calendar")) {
  reply = await handleCalendarCommand(text);
} else {
  reply = await handleMission(text);
}

    await ctx.reply(reply);
  } catch (err) {
    console.error("❌ Runtime error:", err);
    await ctx.reply("Network or AI error occurred.");
  }
});
bot.catch((err) => {
  console.error("❌ Telegraf error:", err);
});

bot.launch().then(() => {
  console.log("✅ Clawbot running in Multi-Agent mode");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));