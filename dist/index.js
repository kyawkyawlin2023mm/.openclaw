"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const dotenv_1 = __importDefault(require("dotenv"));
const missionControl_1 = require("./missionControl");
dotenv_1.default.config();
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
if (!TELEGRAM_TOKEN || !OPENROUTER_KEY) {
    console.error("❌ Missing env variables");
    process.exit(1);
}
const bot = new telegraf_1.Telegraf(TELEGRAM_TOKEN);
bot.start((ctx) => ctx.reply("🤖 Clawbot is online (Multi-Agent Mode)"));
bot.on("text", async (ctx) => {
    try {
        await ctx.sendChatAction("typing");
        const userMessage = ctx.message.text;
        const reply = await (0, missionControl_1.handleMission)(userMessage);
        await ctx.reply(reply);
    }
    catch (err) {
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
