"use strict";
// missionControl.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMission = handleMission;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY");
}
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
    if (!res.ok) {
        const err = await res.text();
        throw new Error("OpenRouter error: " + err);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
}
// ✍️ Content Agent
const CONTENT_PROMPT = `
You are the Content Agent.
You generate the main answer for the user.
Be helpful, accurate, and clear.
`;
async function contentAgent(task) {
    return await callOpenRouter([
        { role: "system", content: CONTENT_PROMPT },
        { role: "user", content: task },
    ]);
}
// 🎨 UX Agent
const UX_PROMPT = `
You are the UX Agent.
You improve formatting, structure, and clarity.
Return a clean, nicely formatted final answer.
`;
async function uxAgent(task, input) {
    return await callOpenRouter([
        { role: "system", content: UX_PROMPT },
        { role: "user", content: `Task: ${task}\n\nContent:\n${input}` },
    ]);
}
// ⚡ Efficiency Agent
const EFFICIENCY_PROMPT = `
You are the Efficiency Agent.
You shorten, optimize, and remove unnecessary parts.
Keep the answer useful but concise.
`;
async function efficiencyAgent(task, input) {
    return await callOpenRouter([
        { role: "system", content: EFFICIENCY_PROMPT },
        { role: "user", content: `Task: ${task}\n\nContent:\n${input}` },
    ]);
}
// 🕹️ Mission Control (Simple & Reliable Pipeline)
async function handleMission(userMessage) {
    // 1) Generate content
    let result = await contentAgent(userMessage);
    // 2) Improve UX / formatting
    result = await uxAgent("Improve formatting and clarity", result);
    // 3) Optimize / shorten
    result = await efficiencyAgent("Make it concise and useful", result);
    return result && result.trim().length > 0 ? result : "No result generated.";
}
