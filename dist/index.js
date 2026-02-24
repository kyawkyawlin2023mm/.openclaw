"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const dotenv_1 = __importDefault(require("dotenv"));
const contentFactory_1 = require("./contentFactory");
const calendarFactory_1 = require("./calendarFactory");
const missionControl_1 = require("./missionControl");
const userMemory_1 = require("./userMemory");
const trendService_1 = require("./trendService");
dotenv_1.default.config();
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_TOKEN) {
    console.error("❌ Missing TELEGRAM_BOT_TOKEN");
    process.exit(1);
}
const bot = new telegraf_1.Telegraf(TELEGRAM_TOKEN);
bot.start((ctx) => ctx.reply("🤖 Clawbot is online and ready!"));
bot.on("text", async (ctx) => {
    try {
        const text = ctx.message.text || "";
        const userId = String(ctx.from?.id || "unknown");
        await ctx.sendChatAction("typing");
        // ===== /profile commands =====
        if (text.startsWith("/profile")) {
            // /profile set platform tiktok
            // /profile set niche BMW motorcycles
            // /profile set tone energetic
            // /profile set language my
            // /profile show
            const parts = text.split(" ").slice(1); // remove /profile
            const action = parts.shift();
            if (action === "show") {
                const profile = (0, userMemory_1.getUserProfile)(userId);
                await ctx.reply("Your profile:\n" + JSON.stringify(profile, null, 2));
                return;
            }
            if (action === "set") {
                const key = parts.shift();
                const value = parts.join(" ");
                if (!key || !value) {
                    await ctx.reply("Usage: /profile set platform|niche|tone|language value");
                    return;
                }
                if (key === "language" && (value === "my" || value === "en")) {
                    (0, userMemory_1.updateUserProfile)(userId, { language: value });
                }
                else if (key === "platform") {
                    (0, userMemory_1.updateUserProfile)(userId, { platform: value });
                }
                else if (key === "niche") {
                    (0, userMemory_1.updateUserProfile)(userId, { niche: value });
                }
                else if (key === "tone") {
                    (0, userMemory_1.updateUserProfile)(userId, { tone: value });
                }
                else {
                    await ctx.reply("Unknown key. Use: language, platform, niche, tone");
                    return;
                }
                await ctx.reply("✅ Profile updated!");
                return;
            }
            await ctx.reply("Usage:\n/profile show\n/profile set platform|niche|tone|language value");
            return;
        }
        // ===== /trend command =====
        if (text.startsWith("/trend")) {
            // /trend tiktok | /trend youtube | /trend fb
            const parts = text.split(" ").slice(1);
            const platform = (parts[0] || "tiktok").toLowerCase();
            const trends = await (0, trendService_1.getTrends)(platform);
            // Always show something (fail-safe)
            const list = (trends && trends.length ? trends : ["Using fallback ideas"]).slice(0, 10);
            const msg = `🔥 Trending on ${platform}:\n\n` +
                list.map((t, i) => `${i + 1}. ${t}`).join("\n");
            await ctx.reply(msg);
            return;
        }
        // ===== Other commands =====
        let reply = "";
        if (text.startsWith("/content")) {
            reply = await (0, contentFactory_1.handleContentCommand)(text, userId);
        }
        else if (text.startsWith("/calendar")) {
            reply = await (0, calendarFactory_1.handleCalendarCommand)(text, userId);
        }
        else {
            reply = await (0, missionControl_1.handleMission)(text);
        }
        await ctx.reply(reply);
    }
    catch (err) {
        console.error("❌ Runtime error:", err);
        await ctx.reply("⚠️ An error occurred. Please try again.");
    }
});
bot.catch((err) => {
    console.error("❌ Telegraf error:", err);
});
bot.launch().then(() => {
    console.log("✅ Clawbot is running");
});
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
