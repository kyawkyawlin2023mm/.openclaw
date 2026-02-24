"use strict";
// trendService.ts — Fail-safe trends (uses live fetch, falls back to samples)
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrends = getTrends;
// Some fallback sample trends (used if network is blocked)
const FALLBACK_TRENDS = {
    tiktok: [
        "AI voice clone videos",
        "BMW motorcycle POV rides",
        "Street food ASMR",
        "Before vs After transformations",
        "Daily routine vlog",
        "Motivation quotes short video",
        "Travel cinematic reels",
        "Fitness progress challenge",
        "Funny reaction clips",
        "Life hacks in 30 seconds",
    ],
    youtube: [
        "AI tools you should use in 2026",
        "BMW motorcycle review",
        "How to grow on YouTube fast",
        "Beginner fitness workout at home",
        "Top 10 tech gadgets",
        "Daily vlog behind the scenes",
        "Make money online tutorial",
        "Coding for beginners",
        "Travel vlog cinematic",
        "Motivation speech compilation",
    ],
    facebook: [
        "Success motivation story",
        "Small business tips",
        "Daily inspiration quote",
        "Life lesson short story",
        "Health and fitness tips",
        "Work from home ideas",
        "Personal growth advice",
        "Funny relatable post",
        "Before and after story",
        "Community discussion topic",
    ],
};
function extractTitles(xml) {
    const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)]
        .map((m) => m[1].trim())
        .filter((t) => t && !/youtube|daily search trends|google trends/i.test(t));
    return titles;
}
async function getTrends(platform) {
    const key = platform === "youtube" ? "youtube" : platform === "facebook" || platform === "fb" ? "facebook" : "tiktok";
    try {
        if (key === "youtube") {
            const url = "https://www.youtube.com/feeds/trending.xml";
            const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
            if (!res.ok)
                throw new Error("YouTube RSS blocked");
            const text = await res.text();
            const titles = extractTitles(text).slice(0, 10);
            if (titles.length)
                return titles;
        }
        else {
            // Google Trends fallback for tiktok/facebook
            const url = "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US";
            const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
            if (!res.ok)
                throw new Error("Google Trends RSS blocked");
            const text = await res.text();
            const titles = extractTitles(text).slice(0, 10);
            if (titles.length)
                return titles;
        }
    }
    catch (err) {
        console.error("Trend fetch error, using fallback:", err);
    }
    // ✅ Always return fallback trends if live fetch fails
    return FALLBACK_TRENDS[key] || FALLBACK_TRENDS.tiktok;
}
