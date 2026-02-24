"use strict";
// calendarFactory.ts (Profile-aware Calendar → Auto Full Scripts)
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCalendarCommand = handleCalendarCommand;
const userMemory_1 = require("./userMemory");
// Reuse OpenRouter caller (same config as contentFactory)
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
async function callOpenRouter(messages) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${OPENROUTER_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "openai/gpt-4.1",
            messages,
            temperature: 0.7,
            max_tokens: 800,
        }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error("OpenRouter error: " + err);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
}
// ===== Language helper =====
const BASE_LANGUAGE_RULE = `
If the user writes in Burmese (Myanmar), respond in Burmese.
If the user writes in English, respond in English.
Always match the user's language.
`;
function languageHint(profileLang) {
    if (profileLang === "my")
        return "\nRespond in Burmese (Myanmar).\n";
    if (profileLang === "en")
        return "\nRespond in English.\n";
    return "\n" + BASE_LANGUAGE_RULE + "\n";
}
// ===== Prompts =====
const CALENDAR_PLANNER = `
You are a Content Calendar Planner.
Given a topic and number of days, produce a list of daily content angles.
Rules:
- Return exactly N short titles, one per line.
- Each line should be a different angle.
- No numbering, no markdown, no extra text.
`;
const TIKTOK_HOOK = `
You are a TikTok Hook Writer.
Create a short, punchy, scroll-stopping opening line (1-2 lines).
No labels or markdown.
`;
const TIKTOK_SCRIPT = `
You are a TikTok Script Writer.
Write a 30-60 second script, energetic and easy to speak.
No labels or markdown.
`;
const YT_HOOK = `
You are a YouTube Title/Hook Writer.
Write a compelling title + opening hook (2-3 lines total).
No labels or markdown.
`;
const YT_SCRIPT = `
You are a YouTube Outline & Script Writer.
Provide:
- Short intro
- 3-5 bullet outline points
- Short outro
No labels or markdown.
`;
const FB_HOOK = `
You are a Facebook Post Opener.
Write a friendly, story-like opening (2-3 lines).
No labels or markdown.
`;
const FB_SCRIPT = `
You are a Facebook Post Writer.
Write a short story-style post with a discussion question at the end.
No labels or markdown.
`;
const CTA_PROMPT = `
You are a CTA Writer.
Write 2-3 short call-to-action lines (Follow, Comment, Like, Share).
No labels or markdown.
`;
const HASHTAG_STRATEGY_PROMPT = `
You are a Hashtag Strategist.
Generate hashtags in THREE groups:

- Reach: broad, high-traffic hashtags
- Niche: topic-specific, targeted hashtags
- Branded: channel/brand/style hashtags (invent if needed)

Rules:
- Each group should have 4-6 hashtags
- Output exactly in this format:

Reach: #tag #tag #tag
Niche: #tag #tag #tag
Branded: #tag #tag #tag

- No explanations, no markdown, no extra text.
`;
const UX_PROMPT = `
You are a UX Formatter.
Rules:
- Remove labels, markdown, quotes, and noise.
- Do NOT mention AI/agents.
- Structure with these sections exactly:

Hook:
Script:
CTA:
Hashtags:

- Clean and readable for Telegram.
`;
const FINAL_EDITOR = `
You are a Final Editor.
Rules:
- Clean up, remove repetition.
- Keep it short, punchy, natural.
- Output ONLY the final content ready to post.
`;
// ===== Agents =====
async function hookAgent(platform, topic, tone, audience, langHint) {
    let sys = TIKTOK_HOOK;
    if (platform === "youtube")
        sys = YT_HOOK;
    if (platform === "facebook")
        sys = FB_HOOK;
    return callOpenRouter([
        { role: "system", content: sys + langHint },
        { role: "user", content: `Topic: ${topic}\nAudience: ${audience}\nTone: ${tone}` },
    ]);
}
async function scriptAgent(platform, topic, tone, audience, langHint) {
    let sys = TIKTOK_SCRIPT;
    if (platform === "youtube")
        sys = YT_SCRIPT;
    if (platform === "facebook")
        sys = FB_SCRIPT;
    return callOpenRouter([
        { role: "system", content: sys + langHint },
        { role: "user", content: `Topic: ${topic}\nAudience: ${audience}\nTone: ${tone}` },
    ]);
}
async function ctaAgent(topic, langHint) {
    return callOpenRouter([
        { role: "system", content: CTA_PROMPT + langHint },
        { role: "user", content: topic },
    ]);
}
async function hashtagStrategyAgent(topic, platform, langHint) {
    return callOpenRouter([
        { role: "system", content: HASHTAG_STRATEGY_PROMPT + langHint },
        { role: "user", content: `Platform: ${platform}\nTopic: ${topic}` },
    ]);
}
async function uxAgent(content, langHint) {
    return callOpenRouter([
        { role: "system", content: UX_PROMPT + langHint },
        { role: "user", content: content },
    ]);
}
async function finalEditor(content, langHint) {
    return callOpenRouter([
        { role: "system", content: FINAL_EDITOR + langHint },
        { role: "user", content: content },
    ]);
}
// ===== Main handler =====
async function handleCalendarCommand(text, userId) {
    // Examples:
    // /calendar tiktok BMW 7days --full
    // /calendar BMW 14days --full
    const raw = text;
    const wantsFull = /--full/i.test(raw);
    const cleaned = raw.replace(/--full/i, "").trim();
    const parts = cleaned.split(" ").slice(1); // remove /calendar
    // Load profile
    const profile = userId ? (0, userMemory_1.getUserProfile)(String(userId)) : {};
    const langHint = languageHint(profile.language);
    // platform: from command or profile or default
    let platformInput = (parts[0] || "").toLowerCase();
    const knownPlatforms = ["tiktok", "youtube", "facebook", "fb"];
    let platform;
    if (knownPlatforms.includes(platformInput)) {
        platform = platformInput;
        parts.shift();
    }
    else if (profile.platform) {
        platform = profile.platform;
    }
    else {
        platform = "tiktok";
    }
    const normPlatform = platform === "fb" ? "facebook" : platform;
    // days: find token like "7days" or "14days"
    let days = 7;
    const dayTokenIndex = parts.findIndex((p) => /days$/i.test(p));
    if (dayTokenIndex >= 0) {
        const n = parseInt(parts[dayTokenIndex].replace(/days/i, ""), 10);
        if (!isNaN(n) && n > 0 && n <= 30)
            days = n;
        parts.splice(dayTokenIndex, 1);
    }
    // topic: remaining or profile.niche or fallback
    let topic = parts.join(" ").trim();
    if (!topic && profile.niche)
        topic = profile.niche;
    if (!topic)
        topic = "general topic";
    // Ask planner for daily angles
    const anglesText = await callOpenRouter([
        { role: "system", content: CALENDAR_PLANNER + langHint },
        { role: "user", content: `Topic: ${topic}\nDays: ${days}` },
    ]);
    const angles = anglesText
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, days);
    // If not --full, just return the plan
    if (!wantsFull) {
        return `Calendar Plan (${days} days) for ${normPlatform}:\n\n` + angles.map((a, i) => `Day ${i + 1}: ${a}`).join("\n");
    }
    // Full scripts for each day
    let outputs = [];
    // Basic defaults (could be enhanced later with planner)
    const audience = "general";
    const tone = profile.tone || "energetic";
    for (let i = 0; i < angles.length; i++) {
        const dayTopic = angles[i];
        let hook = await hookAgent(normPlatform, dayTopic, tone, audience, langHint);
        let script = await scriptAgent(normPlatform, dayTopic, tone, audience, langHint);
        let cta = await ctaAgent(dayTopic, langHint);
        let hashtags = await hashtagStrategyAgent(dayTopic, normPlatform, langHint);
        let combined = `
Day ${i + 1}

Hook:
${hook}

Script:
${script}

CTA:
${cta}

Hashtags:
${hashtags}
`;
        combined = await uxAgent(combined, langHint);
        combined = await finalEditor(combined, langHint);
        outputs.push(combined);
    }
    return outputs.join("\n\n====================\n\n");
}
