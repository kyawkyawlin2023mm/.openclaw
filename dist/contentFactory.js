"use strict";
// contentFactory.ts — Pro Content Engine
// Flags: --trend --short --brand --variants N
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleContentCommand = handleContentCommand;
const userMemory_1 = require("./userMemory");
const trendPicker_1 = require("./trendPicker");
const variantScorer_1 = require("./variantScorer");
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
    if (!res.ok)
        throw new Error(await res.text());
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
}
// ===== Language Rule =====
function buildLanguageRule(lang) {
    if (lang === "my") {
        return "Respond ONLY in Burmese (Myanmar). Do NOT mix English except brand names.";
    }
    return "Respond ONLY in English.";
}
// ===== Prompt builders =====
function hookPrompt(langRule, trendHint, shortMode) {
    return `
You are a viral hook writer.
${shortMode ? "Write ULTRA-SHORT (1 line) scroll-stopping hook." : "Write a strong 1-2 lines hook."}
Make it emotional, curiosity-driven.
${langRule}
${trendHint}
No labels, no markdown.
`;
}
function scriptPrompt(langRule, trendHint, brandMode) {
    return `
You are a content script writer.
Write a short engaging script.
${brandMode ? "Emphasize BMW brand traits: engine feel, control, stability, premium German engineering." : ""}
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
// ===== Helpers =====
function getFlag(text, flag) {
    return text.includes(flag);
}
function getVariantsCount(text) {
    const m = text.match(/--variants\s+(\d+)/);
    if (!m)
        return 1;
    const n = parseInt(m[1], 10);
    return isNaN(n) || n < 1 ? 1 : Math.min(n, 5);
}
// ===== Main =====
async function handleContentCommand(text, userId) {
    const profile = (0, userMemory_1.getUserProfile)(userId);
    const lang = profile.language || "en";
    const LANGUAGE_RULE = buildLanguageRule(lang);
    const useTrend = getFlag(text, "--trend");
    const shortMode = getFlag(text, "--short");
    const brandMode = getFlag(text, "--brand");
    const variantsN = getVariantsCount(text);
    const parts = text
        .replace("--trend", "")
        .replace("--short", "")
        .replace("--brand", "")
        .replace(/--variants\s+\d+/g, "")
        .split(" ")
        .slice(1); // remove /content
    const platform = (parts.shift() || profile.platform || "tiktok").toLowerCase();
    const topic = parts.join(" ") || profile.niche || "general topic";
    let trendHint = "";
    if (useTrend) {
        const picked = await (0, trendPicker_1.pickBestTrend)(topic, profile.niche || "general", platform);
        if (picked)
            trendHint = `Use this trend angle strongly: ${picked}`;
    }
    const variants = [];
    for (let i = 0; i < variantsN; i++) {
        const hook = await callOpenRouter([
            { role: "system", content: hookPrompt(LANGUAGE_RULE, trendHint, shortMode) },
            { role: "user", content: `Topic: ${topic}` },
        ]);
        const script = await callOpenRouter([
            {
                role: "system",
                content: scriptPrompt(LANGUAGE_RULE, trendHint, brandMode),
            },
            { role: "user", content: `Topic: ${topic}` },
        ]);
        const cta = await callOpenRouter([
            { role: "system", content: CTA_PROMPT + "\n" + LANGUAGE_RULE },
            { role: "user", content: topic },
        ]);
        const hashtags = await callOpenRouter([
            { role: "system", content: HASHTAG_PROMPT },
            { role: "user", content: `Platform: ${platform}\nTopic: ${topic}` },
        ]);
        const combined = `
Hook:
${hook}

Script:
${script}

CTA:
${cta}

Hashtags:
${hashtags}
`;
        const final = await callOpenRouter([
            { role: "system", content: FINAL_EDITOR + "\n" + LANGUAGE_RULE },
            { role: "user", content: combined },
        ]);
        variants.push(final);
    }
    if (variants.length === 1)
        return variants[0];
    const bestIdx = await (0, variantScorer_1.pickBestVariant)(variants);
    const best = variants[bestIdx];
    return `✅ Best Version (Auto-picked)\n\n${best}`;
}
