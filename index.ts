import { Telegraf } from "telegraf";
import dotenv from "dotenv";

import { handleContentCommand } from "./contentFactory";
import { handleCalendarCommand } from "./calendarFactory";
import { handleMission } from "./missionControl";
import { getUserProfile, updateUserProfile } from "./userMemory";
import { getTrends } from "./trendService";
import { markGood, markBad } from "./userMemory";

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_TOKEN) {
  console.error("❌ Missing TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

const bot = new Telegraf(TELEGRAM_TOKEN);

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
        const profile = getUserProfile(userId);
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
          updateUserProfile(userId, { language: value as any });
        } else if (key === "platform") {
          updateUserProfile(userId, { platform: value as any });
        } else if (key === "niche") {
          updateUserProfile(userId, { niche: value });
        } else if (key === "tone") {
          updateUserProfile(userId, { tone: value });
        } else {
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

      const trends = await getTrends(platform);

      // Always show something (fail-safe)
      const list = (trends && trends.length ? trends : ["Using fallback ideas"]).slice(0, 10);

      const msg =
        `🔥 Trending on ${platform}:\n\n` +
       list.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n");

      await ctx.reply(msg);
      return;
    }

    // ===== Other commands =====
    let reply = "";

// ===== /good /bad feedback =====
if (text === "/good") {
  markGood(userId);
  await ctx.reply("✅ Noted! I’ll try to generate more like this next time.");
  return;
}
if (text === "/bad") {
  markBad(userId);
  await ctx.reply("📝 Got it. I’ll adjust my style.");
  return;
}
    if (text.startsWith("/content")) {
      reply = await handleContentCommand(text, userId);
    } else if (text.startsWith("/calendar")) {
      reply = await handleCalendarCommand(text, userId);
    } else {
      reply = await handleMission(text);
    }

    await ctx.reply(reply);
  } catch (err) {
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