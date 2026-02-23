// calendarFactory.ts

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
      model: "openai/gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("OpenRouter error: " + err);
  }

  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// 🌐 Language rule
const LANGUAGE_RULE = `
If the user writes in Burmese (Myanmar), respond in Burmese.
If the user writes in English, respond in English.
Always match the user's language.
`;

// 🧠 Calendar Planner Prompt
const CALENDAR_PROMPT = `
You are a Content Calendar Planner.
Given a platform, topic, and number of days, generate a day-by-day content plan.

Rules:
- Provide one idea per day
- Each day should have: Day number, Topic/Angle, Short description
- Keep it practical and creator-friendly
- Do NOT mention AI or agents
- Output in a clean, readable list format
${LANGUAGE_RULE}
`;

export async function handleCalendarCommand(text: string) {
  // Examples:
  // /calendar tiktok BMW 7days
  // /calendar youtube fitness 30days

  const parts = text.split(" ").slice(1); // remove /calendar
  const platform = (parts.shift() || "tiktok").toLowerCase();
  const topic = parts.shift() || "general";
  const daysPart = parts.shift() || "7days";

  const days = parseInt(daysPart.replace(/\D/g, "")) || 7;

  const userPrompt = `
Platform: ${platform}
Topic: ${topic}
Days: ${days}
`;

  const calendar = await callOpenRouter([
    { role: "system", content: CALENDAR_PROMPT },
    { role: "user", content: userPrompt },
  ]);

  return calendar;
}