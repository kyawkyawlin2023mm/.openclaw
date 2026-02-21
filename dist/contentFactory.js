"use strict";
// contentFactory.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleContentCommand = handleContentCommand;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
async function callOpenRouter(messages) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${OPENROUTER_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages,
        }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
}
// 🎯 Hook Agent
const HOOK_PROMPT = `
You are a TikTok Hook Agent.
Create a short, punchy, scroll-stopping opening line (1-2 lines).
`;
// ✍️ Script Agent
const SCRIPT_PROMPT = `
You are a TikTok Script Writer.
Write a 30-60 second TikTok script about the topic.
Make it engaging and easy to speak.
`;
// 📣 CTA Agent
const CTA_PROMPT = `
You are a CTA Agent.
Write 2-3 short call-to-action lines (e.g., Follow, Comment, Like, Share).
`;
// #️⃣ Hashtag Agent
const HASHTAG_PROMPT = `
You are a Hashtag Agent.
Generate 8-12 relevant hashtags for TikTok.
Use trending and niche tags.
`;
// 🎨 UX Agent
const UX_PROMPT = `
You are a UX Agent.
Format everything nicely with clear sections and emojis.
`;
// ⚡ Efficiency Agent
const EFFICIENCY_PROMPT = `
You are an Efficiency Agent.
Make the content concise, punchy, and remove fluff.
`;
// Agents
async function hookAgent(topic) {
    return callOpenRouter([
        { role: "system", content: HOOK_PROMPT },
        { role: "user", content: topic },
    ]);
}
async function scriptAgent(topic) {
    return callOpenRouter([
        { role: "system", content: SCRIPT_PROMPT },
        { role: "user", content: topic },
    ]);
}
async function ctaAgent(topic) {
    return callOpenRouter([
        { role: "system", content: CTA_PROMPT },
        { role: "user", content: topic },
    ]);
}
async function hashtagAgent(topic) {
    return callOpenRouter([
        { role: "system", content: HASHTAG_PROMPT },
        { role: "user", content: topic },
    ]);
}
async function uxAgent(content) {
    return callOpenRouter([
        { role: "system", content: UX_PROMPT },
        { role: "user", content: content },
    ]);
}
async function efficiencyAgent(content) {
    return callOpenRouter([
        { role: "system", content: EFFICIENCY_PROMPT },
        { role: "user", content: content },
    ]);
}
// 🎬 Main handler for /content
async function handleContentCommand(text) {
    // Example: /content tiktok BMW motorcycle
    const parts = text.split(" ").slice(1); // remove /content
    const platform = parts.shift() || "tiktok";
    const topic = parts.join(" ") || "general topic";
    if (platform.toLowerCase() !== "tiktok") {
        return "Currently, only TikTok is supported. Use: /content tiktok your topic";
    }
    // 1) Hook
    const hook = await hookAgent(topic);
    // 2) Script
    const script = await scriptAgent(topic);
    // 3) CTA
    const cta = await ctaAgent(topic);
    // 4) Hashtags
    const hashtags = await hashtagAgent(topic);
    // 5) Combine
    let combined = `
🎯 Hook:
${hook}

📝 Script:
${script}

📣 CTA:
${cta}

#️⃣ Hashtags:
${hashtags}
`;
    // 6) UX format
    combined = await uxAgent(combined);
    // 7) Efficiency optimize
    combined = await efficiencyAgent(combined);
    return combined;
}
