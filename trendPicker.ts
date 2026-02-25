// trendPicker.ts — LLM-based Auto Trend Picker

import { getTrends } from "./trendService";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!;
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function callOpenRouter(messages: ChatMessage[]) {
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

  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

const PICKER_PROMPT = `
You are a Trend Picker.
Given:
- Topic
- Audience
- Platform
- A list of trends

Task:
- Pick the SINGLE best trend that fits the topic and audience for the platform.
- Return ONLY the exact trend text.
- No explanations, no quotes, no extra words.
`;

export async function pickBestTrend(
  topic: string,
  audience: string,
  platform: string
): Promise<string | null> {
  const trends = await getTrends(platform);
  if (!trends || !trends.length) return null;

  // If only one, return it
  if (trends.length === 1) return trends[0];

  const list = trends.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join("\n");

  try {
    const reply = await callOpenRouter([
      { role: "system", content: PICKER_PROMPT },
      {
        role: "user",
        content: `Topic: ${topic}\nAudience: ${audience}\nPlatform: ${platform}\n\nTrends:\n${list}`,
      },
    ]);

    const picked = (reply || "").trim();

    // Validate: must be one of the trends
    const found = trends.find((t) => t.toLowerCase() === picked.toLowerCase());
    return found || trends[0]; // fallback to first
  } catch (e) {
    console.error("Trend picker error:", e);
    return trends[0]; // safe fallback
  }
}