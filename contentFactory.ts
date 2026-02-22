// contentFactory.ts (Phase 1.3 Platform Pro)

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

// 🌐 Language rule
const LANGUAGE_RULE = `
If the user writes in Burmese (Myanmar), respond in Burmese.
If the user writes in English, respond in English.
Always match the user's language.
`;

// 🧠 Planner (JSON)
const PLANNER_PROMPT = `
You are a Content Planner Agent.
Analyze the user's request and return a JSON plan with:
- platform: "tiktok" | "youtube" | "facebook"
- audience: e.g., "beginners" | "bikers" | "youth" | "general"
- tone: e.g., "energetic" | "friendly" | "professional"
- steps: array from ["hook","script","cta","hashtags"]

Return ONLY valid JSON. No explanations.
${LANGUAGE_RULE}
`;

async function plannerAgent(input: string) {
  const reply = await callOpenRouter([
    { role: "system", content: PLANNER_PROMPT },
    { role: "user", content: input },
  ]);

  try {
    return JSON.parse(reply);
  } catch {
    return {
      platform: "tiktok",
      audience: "general",
      tone: "energetic",
      steps: ["hook", "script", "cta", "hashtags"],
    };
  }
}

// ===== Agent Prompts =====

// TikTok
const TIKTOK_HOOK = `
You are a TikTok Hook Writer.
Create a short, punchy, scroll-stopping opening line (1-2 lines).
No labels or markdown.
${LANGUAGE_RULE}
`;

const TIKTOK_SCRIPT = `
You are a TikTok Script Writer.
Write a 30-60 second script, energetic and easy to speak.
No labels or markdown.
${LANGUAGE_RULE}
`;

// YouTube
const YT_HOOK = `
You are a YouTube Title/Hook Writer.
Write a compelling title + opening hook (2-3 lines total).
No labels or markdown.
${LANGUAGE_RULE}
`;

const YT_SCRIPT = `
You are a YouTube Outline & Script Writer.
Provide:
- Short intro
- 3-5 bullet outline points
- Short outro
No labels or markdown.
${LANGUAGE_RULE}
`;

// Facebook
const FB_HOOK = `
You are a Facebook Post Opener.
Write a friendly, story-like opening (2-3 lines).
No labels or markdown.
${LANGUAGE_RULE}
`;

const FB_SCRIPT = `
You are a Facebook Post Writer.
Write a short story-style post with a discussion question at the end.
No labels or markdown.
${LANGUAGE_RULE}
`;

// CTA / Hashtags (shared)
const CTA_PROMPT = `
You are a CTA Writer.
Write 2-3 short call-to-action lines (Follow, Comment, Like, Share).
No labels or markdown.
${LANGUAGE_RULE}
`;

const HASHTAG_PROMPT = `
You are a Hashtag Generator.
Generate 8-12 relevant hashtags.
Use trending + niche tags.
Output only hashtags separated by spaces.
`;

// UX & Final
const UX_PROMPT = `
You are a UX Formatter.
Rules:
- Remove labels, markdown, quotes, and noise.
- Do NOT mention AI/agents.
- Structure with these sections exactly:

Hook:
Script:
CTA:
Hashtags:

- Clean and readable for Telegram.
${LANGUAGE_RULE}
`;

const FINAL_EDITOR = `
You are a Final Editor.
Rules:
- Clean up, remove repetition.
- Keep it short, punchy, natural.
- Output ONLY the final content ready to post.
${LANGUAGE_RULE}
`;

// ===== Agent functions =====

async function hookAgent(platform: string, topic: string, tone: string, audience: string) {
  let sys = TIKTOK_HOOK;
  if (platform === "youtube") sys = YT_HOOK;
  if (platform === "facebook") sys = FB_HOOK;

  return callOpenRouter([
    { role: "system", content: sys },
    { role: "user", content: `Topic: ${topic}\nAudience: ${audience}\nTone: ${tone}` },
  ]);
}

async function scriptAgent(platform: string, topic: string, tone: string, audience: string) {
  let sys = TIKTOK_SCRIPT;
  if (platform === "youtube") sys = YT_SCRIPT;
  if (platform === "facebook") sys = FB_SCRIPT;

  return callOpenRouter([
    { role: "system", content: sys },
    { role: "user", content: `Topic: ${topic}\nAudience: ${audience}\nTone: ${tone}` },
  ]);
}

async function ctaAgent(topic: string) {
  return callOpenRouter([
    { role: "system", content: CTA_PROMPT },
    { role: "user", content: topic },
  ]);
}

async function hashtagAgent(topic: string, platform: string) {
  return callOpenRouter([
    { role: "system", content: HASHTAG_PROMPT },
    { role: "user", content: `Platform: ${platform}\nTopic: ${topic}` },
  ]);
}

async function uxAgent(content: string) {
  return callOpenRouter([
    { role: "system", content: UX_PROMPT },
    { role: "user", content: content },
  ]);
}

async function finalEditor(content: string) {
  return callOpenRouter([
    { role: "system", content: FINAL_EDITOR },
    { role: "user", content: content },
  ]);
}

// ===== Main handler =====
export async function handleContentCommand(text: string) {
  // Examples:
  // /content tiktok BMW ဆိုင်ကယ် လူငယ်တွေ အတွက်
  // /content youtube BMW maintenance for beginners
  // /content fb motivation about success

  const parts = text.split(" ").slice(1); // remove /content
  const platformInput = (parts.shift() || "tiktok").toLowerCase();
  const topic = parts.join(" ") || "general topic";

  // Get plan (planner can refine audience/tone/steps)
  const plan = await plannerAgent(`${platformInput} ${topic}`);

  const platform = (plan.platform || platformInput || "tiktok").toLowerCase();
  const audience = plan.audience || "general";
  const tone = plan.tone || "energetic";
  const steps: string[] = plan.steps || ["hook", "script", "cta", "hashtags"];

  if (!["tiktok", "youtube", "facebook", "fb"].includes(platform)) {
    return "Use: /content tiktok|youtube|fb your topic";
  }

  const normPlatform = platform === "fb" ? "facebook" : platform;

  let hook = "";
  let script = "";
  let cta = "";
  let hashtags = "";

  for (const step of steps) {
    if (step === "hook") {
      hook = await hookAgent(normPlatform, topic, tone, audience);
    } else if (step === "script") {
      script = await scriptAgent(normPlatform, topic, tone, audience);
    } else if (step === "cta") {
      cta = await ctaAgent(topic);
    } else if (step === "hashtags") {
      hashtags = await hashtagAgent(topic, normPlatform);
    }
  }

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

  combined = await uxAgent(combined);
  combined = await finalEditor(combined);

  return combined;
}