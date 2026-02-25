// contentFactory.ts (Profile-aware + Auto Trend Picker + Variants + Hashtag Strategy + Critic)

import { getUserProfile } from "./userMemory";
import { pickBestTrend } from "./trendPicker";

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
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("OpenRouter error: " + err);
  }

  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// ===== Language helper =====
const BASE_LANGUAGE_RULE = `
If the user writes in Burmese (Myanmar), respond in Burmese.
If the user writes in English, respond in English.
Always match the user's language.
`;

function languageHint(profileLang?: "my" | "en") {
  if (profileLang === "my") return "\nRespond in Burmese (Myanmar).\n";
  if (profileLang === "en") return "\nRespond in English.\n";
  return "\n" + BASE_LANGUAGE_RULE + "\n";
}

// ===== Prompts =====
const PLANNER_PROMPT = `
You are a Content Planner Agent.
Analyze the user's request and return a JSON plan with:
- platform: "tiktok" | "youtube" | "facebook"
- audience: e.g., "beginners" | "bikers" | "youth" | "general"
- tone: e.g., "energetic" | "friendly" | "professional"
- steps: array from ["hook","script","cta","hashtags"]

Return ONLY valid JSON. No explanations.
`;

const TIKTOK_HOOK = `You are a TikTok Hook Writer. Create a short, punchy hook. No labels.`;
const TIKTOK_SCRIPT = `You are a TikTok Script Writer. Write a 30-60s script. No labels.`;
const YT_HOOK = `You are a YouTube Title/Hook Writer. Title + opening hook. No labels.`;
const YT_SCRIPT = `You are a YouTube Script Writer. Short intro, 3-5 points, outro. No labels.`;
const FB_HOOK = `You are a Facebook Post Opener. Friendly opening. No labels.`;
const FB_SCRIPT = `You are a Facebook Post Writer. Short story + question. No labels.`;

const CTA_PROMPT = `You are a CTA Writer. Write 2-3 short CTA lines. No labels.`;

const HASHTAG_STRATEGY_PROMPT = `
You are a Hashtag Strategist.
Generate hashtags in THREE groups:

Reach: #tag #tag #tag
Niche: #tag #tag #tag
Branded: #tag #tag #tag

Rules:
- 4-6 per group
- Output exactly in this format
- No extra text
`;

const UX_PROMPT = `
You are a UX Formatter.
Structure exactly:

Hook:
Script:
CTA:
Hashtags:
`;

const FINAL_EDITOR = `
You are a Final Editor.
Clean, concise, natural. Output only final content.
`;

const CRITIC_PROMPT = `
You are a Content Critic.
Score versions and recommend the best.
Keep concise.
`;

// ===== Agents =====
async function plannerAgent(input: string, lang: string) {
  const reply = await callOpenRouter([
    { role: "system", content: PLANNER_PROMPT + lang },
    { role: "user", content: input },
  ]);
  try {
    return JSON.parse(reply);
  } catch {
    return { platform: "tiktok", audience: "general", tone: "energetic", steps: ["hook","script","cta","hashtags"] };
  }
}

async function hookAgent(platform: string, topic: string, tone: string, audience: string, lang: string, trendHint: string) {
  let sys = TIKTOK_HOOK;
  if (platform === "youtube") sys = YT_HOOK;
  if (platform === "facebook") sys = FB_HOOK;
  return callOpenRouter([
    { role: "system", content: sys + lang + trendHint },
    { role: "user", content: `Topic: ${topic}\nAudience: ${audience}\nTone: ${tone}` },
  ]);
}

async function scriptAgent(platform: string, topic: string, tone: string, audience: string, lang: string, trendHint: string) {
  let sys = TIKTOK_SCRIPT;
  if (platform === "youtube") sys = YT_SCRIPT;
  if (platform === "facebook") sys = FB_SCRIPT;
  return callOpenRouter([
    { role: "system", content: sys + lang + trendHint },
    { role: "user", content: `Topic: ${topic}\nAudience: ${audience}\nTone: ${tone}` },
  ]);
}

async function ctaAgent(topic: string, lang: string) {
  return callOpenRouter([{ role: "system", content: CTA_PROMPT + lang }, { role: "user", content: topic }]);
}

async function hashtagAgent(topic: string, platform: string, lang: string, trendHint: string) {
  return callOpenRouter([
    { role: "system", content: HASHTAG_STRATEGY_PROMPT + lang + trendHint },
    { role: "user", content: `Platform: ${platform}\nTopic: ${topic}` },
  ]);
}

async function uxAgent(content: string, lang: string) {
  return callOpenRouter([{ role: "system", content: UX_PROMPT + lang }, { role: "user", content: content }]);
}

async function finalEditor(content: string, lang: string) {
  return callOpenRouter([{ role: "system", content: FINAL_EDITOR + lang }, { role: "user", content: content }]);
}

async function criticAgent(variantsText: string, lang: string) {
  return callOpenRouter([{ role: "system", content: CRITIC_PROMPT + lang }, { role: "user", content: variantsText }]);
}

// ===== Main =====
export async function handleContentCommand(text: string, userId?: string) {
  const raw = text;

  const wantsTrend = /--trend/i.test(raw);
  let variants = 1;
  const vMatch = raw.match(/--variants\s+(\d+)/i);
  if (vMatch) variants = Math.max(1, Math.min(5, parseInt(vMatch[1], 10) || 1));
  const wantsScore = /--score/i.test(raw);

  const cleaned = raw.replace(/--trend/i, "").replace(/--variants\s+\d+/i, "").replace(/--score/i, "").trim();
  const parts = cleaned.split(" ").slice(1); // remove /content

  const profile = userId ? getUserProfile(String(userId)) : {};
  const lang = languageHint(profile.language);

  const known = ["tiktok","youtube","facebook","fb"];
  let platformInput = (parts[0] || "").toLowerCase();
  let platform: string;
  if (known.includes(platformInput)) { platform = platformInput; parts.shift(); }
  else if (profile.platform) platform = profile.platform;
  else platform = "tiktok";
  const normPlatform = platform === "fb" ? "facebook" : platform;

  let topic = parts.join(" ").trim();
  if (!topic && profile.niche) topic = profile.niche;
  if (!topic) topic = "general topic";

  const plan = await plannerAgent(`${normPlatform} ${topic}`, lang);
  const audience = plan.audience || "general";
  const tone = plan.tone || profile.tone || "energetic";
  const steps: string[] = plan.steps || ["hook","script","cta","hashtags"];

  // ===== Auto Trend Picker =====
  let trendHint = "";
  if (wantsTrend) {
    const best = await pickBestTrend(topic, audience, normPlatform);
    if (best) {
      trendHint = `\nBest trend to use: ${best}. Use it as inspiration.\n`;
    }
  }

  let outputs: string[] = [];

  for (let i = 1; i <= variants; i++) {
    let hook = "", script = "", cta = "", hashtags = "";
    for (const step of steps) {
      if (step === "hook") hook = await hookAgent(normPlatform, topic, tone, audience, lang, trendHint);
      else if (step === "script") script = await scriptAgent(normPlatform, topic, tone, audience, lang, trendHint);
      else if (step === "cta") cta = await ctaAgent(topic, lang);
      else if (step === "hashtags") hashtags = await hashtagAgent(topic, normPlatform, lang, trendHint);
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
    combined = await uxAgent(combined, lang);
    combined = await finalEditor(combined, lang);
    outputs.push(combined);
  }

  const joined = outputs.join("\n\n--------------------\n\n");

  if (variants > 1 && wantsScore) {
    const scores = await criticAgent(joined, lang);
    return joined + "\n\n====================\n\n" + scores;
  }

  return joined;
}