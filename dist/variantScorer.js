"use strict";
// variantScorer.ts — pick best variant with LLM
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickBestVariant = pickBestVariant;
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
            max_tokens: 300,
        }),
    });
    if (!res.ok)
        throw new Error(await res.text());
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
}
const SCORER_PROMPT = `
You are a content quality judge.
Pick the SINGLE best option based on:
- Virality / hook strength
- Clarity
- Platform fit
Return ONLY the number (1, 2, 3, ...).
No explanation.
`;
async function pickBestVariant(variants) {
    if (variants.length === 1)
        return 0;
    const list = variants.map((v, i) => `Option ${i + 1}:\n${v}`).join("\n\n");
    try {
        const reply = await callOpenRouter([
            { role: "system", content: SCORER_PROMPT },
            { role: "user", content: list },
        ]);
        const n = parseInt((reply || "").trim(), 10);
        if (!isNaN(n) && n >= 1 && n <= variants.length)
            return n - 1;
        return 0;
    }
    catch {
        return 0;
    }
}
