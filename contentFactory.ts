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

  if (!res.ok) {
    const err = await res.text();
    throw new Error("OpenRouter error: " + err);
  }

  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// 🌐 Language rule (shared)
const LANGUAGE_RULE = `
If the user writes in Burmese (Myanmar), respond in Burmese.
If the user writes in English, respond in English.
Always match the user's language.
`;

// 🧠 Planner Agent (JSON)
const PLANNER_PROMPT = `
You are a Content Planner Agent.
Analyze the user's request and return a JSON plan.
The plan must include:
- platform (tiktok, youtube, facebook)
- audience (e.g., beginners, bikers, youth, general)
- tone (e.g., energetic, professional, friendly)
- steps (array of steps like: hook, script, cta, hashtags)

Return ONLY valid JSON. No explanation.
${LANGUAGE_RULE}
`;

async function plannerAgent(topic: string) {
  const reply = await callOpenRouter([
    { role: "system", content: PLANNER_PROMPT },
    { role: "user", content: topic },
  ]);

  try {
    return JSON.parse(reply);
  } catch {
    // fallback plan
    return {
      platform: "tiktok",
      audience: "general",
      tone: "energetic",
      steps: ["hook", "script", "cta", "hashtags"],
    };
  }
}

// 🎯 Hook Agent
const HOOK_PROMPT = `
You are a TikTok Hook Writer.
Create a short, punchy, scroll-stopping opening line (1-2 lines).
Do not include any labels, markdown, or explanations.
${LANGUAGE_RULE}
`;

// ✍️ Script Agent
const SCRIPT_PROMPT = `
You are a TikTok Script Writer.
Write a 30-60 second TikTok script about the topic.
Make it engaging and easy to speak.
Do not include any labels, markdown, or explanations.
${LANGUAGE_RULE}
`;

// 📣 CTA Agent
const CTA_PROMPT = `
You are a CTA Writer.
Write 2-3 short call-to-action lines (e.g., Follow, Comment, Like, Share).
Do not include any labels, markdown, or explanations.
${LANGUAGE_RULE}
`;

// #️⃣ Hashtag Agent
const HASHTAG_PROMPT = `
You are a Hashtag Generator.
Generate 8-12 relevant hashtags for TikTok.
Use trending and niche tags.
Output only hashtags separated by spaces.
`;

// 🎨 UX Formatter
const UX_PROMPT = `
You are a UX Formatter.
Rules:
- Remove any agent names, role labels, markdown (###, **, quotes), or extra noise.
- Do NOT mention AI, agents, or assistants.
- Keep only the final content.
- Structure it with these exact sections:

Hook:
Script:
CTA:
Hashtags:

- Make it clean and readable for Telegram.
${LANGUAGE_RULE}
`;

// ⚡ Final Editor
const EFFICIENCY_PROMPT = `
You are a Final Editor.
Rules:
- Clean up the text.
- Remove repetition and weird formatting.
- Keep it short, punchy, and natural.
- Do NOT add any explanations or labels about AI or agents.
- Output ONLY the final content ready to post.
${LANGUAGE_RULE}
`;

// Agent functions
async function hookAgent(topic: string) {
  return callOpenRouter([
    { role: "system", content: HOOK_PROMPT },
    { role: "user", content: topic },
  ]);
}

async function scriptAgent(topic: string) {
  return callOpenRouter([
    { role: "system", content: SCRIPT_PROMPT },
    { role: "user", content: topic },
  ]);
}

async function ctaAgent(topic: string) {
  return callOpenRouter([
    { role: "system", content: CTA_PROMPT },
    { role: "user", content: topic },
  ]);
}

async function hashtagAgent(topic: string) {
  return callOpenRouter([
    { role: "system", content: HASHTAG_PROMPT },
    { role: "user", content: topic },
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

// 🎬 Main handler for /content (Plan-based orchestration)
export async function handleContentCommand(text: string) {
  // Example: /content tiktok BMW ဆိုင်ကယ်
  const parts = text.split(" ").slice(1); // remove /content
  const platform = (parts.shift() || "tiktok").toLowerCase();
  const topic = parts.join(" ") || "general topic";

  // 0) Get plan
  const plan = await plannerAgent(`${platform} ${topic}`);

  // Phase 1.2 scope: TikTok only
  if (plan.platform && String(plan.platform).toLowerCase() !== "tiktok") {
    return "Currently, only TikTok is supported. Use: /content tiktok your topic";
  }

  let hook = "";
  let script = "";
  let cta = "";
  let hashtags = "";

  // 1) Execute steps based on plan
  for (const step of plan.steps || []) {
    if (step === "hook") {
      hook = await hookAgent(topic);
    } else if (step === "script") {
      script = await scriptAgent(topic);
    } else if (step === "cta") {
      cta = await ctaAgent(topic);
    } else if (step === "hashtags") {
      hashtags = await hashtagAgent(topic);
    }
  }

  // 2) Combine (clean base)
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

  // 3) UX format
  combined = await uxAgent(combined);

  // 4) Final clean
  combined = await efficiencyAgent(combined);

  return combined;
}