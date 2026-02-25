"use strict";
// trendPicker.ts — LLM-based Auto Trend Picker
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickBestTrend = pickBestTrend;
const trendService_1 = require("./trendService");
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
            temperature: 0.2,
            max_tokens: 200,
        }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error("OpenRouter error: " + err);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
}
const PICKER_PROMPT = `
You are a Trend Picker.
Pick the SINGLE best trend that fits the topic and audience for the platform.
Return ONLY the exact trend text.
No explanations.
`;
async function pickBestTrend(topic, audience, platform) {
    const trends = await (0, trendService_1.getTrends)(platform);
    if (!trends || !trends.length)
        return null;
    if (trends.length === 1)
        return trends[0];
    const list = trends
        .slice(0, 10)
        .map((t, i) => `${i + 1}. ${t}`)
        .join("\n");
    try {
        const reply = await callOpenRouter([
            { role: "system", content: PICKER_PROMPT },
            {
                role: "user",
                content: `Topic: ${topic}\nAudience: ${audience}\nPlatform: ${platform}\n\nTrends:\n${list}`,
            },
        ]);
        const picked = (reply || "").trim();
        const found = trends.find((t) => t.toLowerCase() === picked.toLowerCase());
        return found || trends[0];
    }
    catch (e) {
        console.error("Trend picker error:", e);
        return trends[0];
    }
}
