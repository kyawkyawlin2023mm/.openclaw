"use strict";
// contentFactory.ts — Language Purifier + Auto Trend + Hook Booster
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleContentCommand = handleContentCommand;
const userMemory_1 = require("./userMemory");
const trendPicker_1 = require("./trendPicker");
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
            max_tokens: 1200,
        }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error("OpenRouter error: " + err);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
}
// ===== Language Rule Builder =====
function buildLanguageRule(lang) {
    if (lang === "my") {
        return "Respond ONLY in Burmese (Myanmar). Do NOT mix English except brand names.";
    }
    return "Respond ONLY in English.";
}
// ===== Prompts =====
function hookPrompt(langRule, trendHint) {
    return `
You are a viral content hook writer.
Write a short, powerful, scroll-stopping hook (1-2 lines).
${langRule}
${trendHint}
No labels, no markdown.
`;
}
function scriptPrompt(langRule, trendHint) {
    return `
You are a content script writer.
Write a short, engaging script.
${langRule}
${trendHint}
No labels, no markdown.
`;
}
const CTA_PROMPT = `
Write 2-3 short call-to-action lines.
No labels, no markdown.
`;
const HASHTAG_PROMPT = `
Generate 8-12 relevant hashtags.
Output only hashtags separated by spaces.
`;
const FINAL_EDITOR = `
You are a final editor.
Clean up, remove repetition, keep it natural and punchy.
Do not mention AI.
Output only the final content.
`;
// ===== Main Handler =====
async function handleContentCommand(text, userId) {
    const profile = (0, userMemory_1.getUserProfile)(userId);
    const lang = profile.language || "en";
    const LANGUAGE_RULE = buildLanguageRule(lang);
    const parts = text.split(" ").slice(1); // remove /content
    const platform = (parts.shift() || profile.platform || "tiktok").toLowerCase();
    const topic = parts.join(" ") || profile.niche || "general topic";
    const useTrend = text.includes("--trend");
    let trendHint = "";
    if (useTrend) {
        const picked = await (0, trendPicker_1.pickBestTrend)(topic, profile.niche || "general", platform);
        if (picked) {
            trendHint = `Use this trend angle strongly: ${picked}`;
        }
    }
    // 1) Hook
    const hook = await callOpenRouter([
        { role: "system", content: hookPrompt(LANGUAGE_RULE, trendHint) },
        { role: "user", content: `Topic: ${topic}` },
    ]);
    // 2) Script
    const script = await callOpenRouter([
        { role: "system", content: scriptPrompt(LANGUAGE_RULE, trendHint) },
        { role: "user", content: `Topic: ${topic}` },
    ]);
    // 3) CTA
    const cta = await callOpenRouter([
        { role: "system", content: CTA_PROMPT + "\n" + LANGUAGE_RULE },
        { role: "user", content: topic },
    ]);
    // 4) Hashtags
    const hashtags = await callOpenRouter([
        { role: "system", content: HASHTAG_PROMPT },
        { role: "user", content: `Platform: ${platform}\nTopic: ${topic}` },
    ]);
    // Combine
    let combined = `
Hook:
${hook}

Script:
${script}

CTA:
${cta}

Hashtags:
${hashtags}
`;
    // Final edit (with language rule again)
    const final = await callOpenRouter([
        { role: "system", content: FINAL_EDITOR + "\n" + LANGUAGE_RULE },
        { role: "user", content: combined },
    ]);
    return final;
}
