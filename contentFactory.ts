// contentFactory.ts (Profile-aware + Platform Pro + Variants + Hashtag Strategy Pro + Critic/Scorer)

import { getUserProfile } from "./userMemory";

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
      temperature: 0.7,
      max_tokens: 800, // keep under credit limit
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("OpenRouter error: " + err);
  }

  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// 🌐 Language rule (dynamic hint added later)
const BASE_LANGUAGE_RULE = `
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
${BASE_LANGUAGE_RULE}
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

// ===== Agent Prompts (language hint will be appended) =====

// TikTok
const TIKTOK_HOOK = `
You are a TikTok Hook Writer.
Create a short, punchy, scroll-stopping opening line (1-2 lines).
No labels or markdown.
`;

const TIKTOK_SCRIPT = `
You are a TikTok Script Writer.
Write a 30-60 second script, energetic and easy to speak.
No labels or markdown.
`;

// YouTube
const YT_HOOK = `
You are a YouTube Title/Hook Writer.
Write a compelling title + opening hook (2-3 lines total).
No labels or markdown.
`;

const YT_SCRIPT = `
You are a YouTube Outline & Script Writer.
Provide:
- Short intro
- 3-5 bullet outline points
- Short outro
No labels or markdown.
`;

// Facebook
const FB_HOOK = `
You are a Facebook Post Opener.
Write a friendly, story-like opening (2-3 lines).
No labels or markdown.
`;

const FB_SCRIPT = `
You are a Facebook Post Writer.
Write a short story-style post with a discussion question at the end.
No labels or markdown.
`;

// CTA
const CTA_PROMPT = `
You are a CTA Writer.
Write 2-3 short call-to-action lines (Follow, Comment, Like, Share).
No labels or markdown.
`;

// 🏷️ Hashtag Strategy Pro
const HASHTAG_STRATEGY_PROMPT = `
You are a Hashtag Strategist.
Generate hashtags in THREE groups:

- Reach: broad, high-traffic hashtags
- Niche: topic-specific, targeted hashtags
- Branded: channel/brand/style hashtags (invent if needed)

Rules:
- Each group should have 4-6 hashtags
- Output exactly in this format:

Reach: #tag #tag #tag
Niche: #tag #tag #tag
Branded: #tag #tag #tag

- No explanations, no markdown, no extra text.
`;

// 🧪 Critic / Scorer
const CRITIC_PROMPT = `
You are a Content Critic.
Given multiple versions, score each from 1 to 10 based on:
- Hook strength
- Clarity
- Engagement potential
- Platform fit

Rules:
- Output a ranked list from best to worst.
- For each version, include: "Version X: Score Y/10 - short reason"
- Then recommend ONE best version.
- Keep it concise.
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
`;

const FINAL_EDITOR = `
You are a Final Editor.
Rules:
- Clean up, remove repetition.
- Keep it short, punchy, natural.
- Output ONLY the final content ready to post.
`;

// ===== Helpers =====
function languageHint(profileLang?: "my" | "en") {
  if (profileLang === "my") return "\nRespond in Burmese (Myanmar).\n";
  if (profileLang === "en") return "\nRespond in English.\n";
  return "\n" + BASE_LANGUAGE_RULE + "\n";
}

// ===== Agent functions =====

async function hookAgent(platform: string, topic: string, tone: string, audience: string, langHint: string) {
  let sys = TIKTOK_HOOK;
  if (platform === "youtube") sys = YT_HOOK;
  if (platform === "facebook") sys = FB_HOOK;

  return callOpenRouter([
    { role: "system", content: sys + langHint },
    { role: "user", content: `Topic: ${topic}\nAudience: ${audience}\nTone: ${tone}` },
  ]);
}

async function scriptAgent(platform: string, topic: string, tone: string, audience: string, langHint: string) {
  let sys = TIKTOK_SCRIPT;
  if (platform === "youtube") sys = YT_SCRIPT;
  if (platform === "facebook") sys = FB_SCRIPT;

  return callOpenRouter([
    { role: "system", content: sys + langHint },
    { role: "user", content: `Topic: ${topic}\nAudience: ${audience}\nTone: ${tone}` },
  ]);
}

async function ctaAgent(topic: string, langHint: string) {
  return callOpenRouter([
    { role: "system", content: CTA_PROMPT + langHint },
    { role: "user", content: topic },
  ]);
}

async function hashtagStrategyAgent(topic: string, platform: string, langHint: string) {
  return callOpenRouter([
    { role: "system", content: HASHTAG_STRATEGY_PROMPT + langHint },
    { role: "user", content: `Platform: ${platform}\nTopic: ${topic}` },
  ]);
}

async function uxAgent(content: string, langHint: string) {
  return callOpenRouter([
    { role: "system", content: UX_PROMPT + langHint },
    { role: "user", content: content },
  ]);
}

async function finalEditor(content: string, langHint: string) {
  return callOpenRouter([
    { role: "system", content: FINAL_EDITOR + langHint },
    { role: "user", content: content },
  ]);
}

async function criticAgent(variantsText: string, langHint: string) {
  return callOpenRouter([
    { role: "system", content: CRITIC_PROMPT + langHint },
    { role: "user", content: variantsText },
  ]);
}

// ===== Main handler =====
export async function handleContentCommand(text: string, userId?: string) {
  // /content [platform?] [topic...] [--variants N] [--score]
  const raw = text;

  // flags
  let variants = 1;
  const vMatch = raw.match(/--variants\s+(\d+)/i);
  if (vMatch) {
    variants = Math.max(1, Math.min(5, parseInt(vMatch[1], 10) || 1));
  }
  const wantsScore = /--score/i.test(raw);

  // clean flags
  const cleaned = raw
    .replace(/--variants\s+\d+/i, "")
    .replace(/--score/i, "")
    .trim();

  const parts = cleaned.split(" ").slice(1); // remove /content

  // Load profile
  const profile = userId ? getUserProfile(String(userId)) : {};
  const langHint = languageHint(profile.language);

  // platform: from command or profile or default
  let platformInput = (parts[0] || "").toLowerCase();
  const knownPlatforms = ["tiktok", "youtube", "facebook", "fb"];
  let platform: string;

  if (knownPlatforms.includes(platformInput)) {
    platform = platformInput;
    parts.shift(); // consume platform token
  } else if (profile.platform) {
    platform = profile.platform;
  } else {
    platform = "tiktok";
  }

  // topic: from remaining parts or profile.niche or fallback
  let topic = parts.join(" ").trim();
  if (!topic && profile.niche) topic = profile.niche;
  if (!topic) topic = "general topic";

  // Planner can refine audience/tone/steps
  const plan = await plannerAgent(`${platform} ${topic}`);

  const audience = plan.audience || "general";
  const tone = plan.tone || profile.tone || "energetic";
  const steps: string[] = plan.steps || ["hook", "script", "cta", "hashtags"];

  if (!["tiktok", "youtube", "facebook", "fb"].includes(platform)) {
    return "Use: /content tiktok|youtube|fb your topic";
  }

  const normPlatform = platform === "fb" ? "facebook" : platform;

  let outputs: string[] = [];

  for (let i = 1; i <= variants; i++) {
    let hook = "";
    let script = "";
    let cta = "";
    let hashtags = "";

    for (const step of steps) {
      if (step === "hook") hook = await hookAgent(normPlatform, topic, tone, audience, langHint);
      else if (step === "script") script = await scriptAgent(normPlatform, topic, tone, audience, langHint);
      else if (step === "cta") cta = await ctaAgent(topic, langHint);
      else if (step === "hashtags") hashtags = await hashtagStrategyAgent(topic, normPlatform, langHint);
    }

    let combined = `
Version ${i}

Hook:
${hook}

Script:
${script}

CTA:
${cta}

Hashtags:
${hashtags}
`;

    combined = await uxAgent(combined, langHint);
    combined = await finalEditor(combined, langHint);

    outputs.push(combined);
  }

  const joined = outputs.join("\n\n--------------------\n\n");

  if (variants > 1 && wantsScore) {
    const scores = await criticAgent(joined, langHint);
    return joined + "\n\n====================\n\n" + scores;
  }

  return joined;
}