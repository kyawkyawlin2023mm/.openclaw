// contentFactory.ts

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
      model: "openai/gpt-4o-mini",
      messages,
    }),
  });

  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// 🧠 Planner Agent
const PLANNER_PROMPT = `
You are a Content Planner Agent.
Given a platform and topic, create a short plan for the content.
Return a short bullet plan.
`;

// ✍️ Script Agent
const SCRIPT_PROMPT = `
You are a Script Writer Agent.
Write the main content/script based on the plan and topic.
`;

// 🎯 Hook Agent
const HOOK_PROMPT = `
You are a Hook Agent.
Create a catchy opening hook for the content.
`;

// 🎨 UX Agent
const UX_PROMPT = `
You are a UX Agent.
Format the content nicely for posting (sections, emojis if suitable, readability).
`;

// ⚡ Efficiency Agent
const EFFICIENCY_PROMPT = `
You are an Efficiency Agent.
Make the content concise, remove fluff, keep it powerful.
`;

async function plannerAgent(platform: string, topic: string) {
  return callOpenRouter([
    { role: "system", content: PLANNER_PROMPT },
    { role: "user", content: `Platform: ${platform}\nTopic: ${topic}` },
  ]);
}

async function scriptAgent(plan: string, platform: string, topic: string) {
  return callOpenRouter([
    { role: "system", content: SCRIPT_PROMPT },
    { role: "user", content: `Platform: ${platform}\nTopic: ${topic}\nPlan:\n${plan}` },
  ]);
}

async function hookAgent(script: string) {
  return callOpenRouter([
    { role: "system", content: HOOK_PROMPT },
    { role: "user", content: script },
  ]);
}

async function uxAgent(content: string) {
  return callOpenRouter([
    { role: "system", content: UX_PROMPT },
    { role: "user", content: content },
  ]);
}

async function efficiencyAgent(content: string) {
  return callOpenRouter([
    { role: "system", content: EFFICIENCY_PROMPT },
    { role: "user", content: content },
  ]);
}

// 🎬 Main handler for /content
export async function handleContentCommand(text: string) {
  // Example: /content tiktok BMW motorcycle
  const parts = text.split(" ").slice(1); // remove /content
  const platform = parts.shift() || "general";
  const topic = parts.join(" ") || "general topic";

  // 1) Plan
  const plan = await plannerAgent(platform, topic);

  // 2) Script
  const script = await scriptAgent(plan, platform, topic);

  // 3) Hook
  const hook = await hookAgent(script);

  // 4) Combine
  let combined = `🔥 Hook:\n${hook}\n\n📝 Content:\n${script}`;

  // 5) UX format
  combined = await uxAgent(combined);

  // 6) Efficiency optimize
  combined = await efficiencyAgent(combined);

  return combined;
}