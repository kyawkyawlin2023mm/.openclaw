// calendarFactory.ts (Profile-aware + Auto Trend Picker)

import { getUserProfile } from "./userMemory";
import { pickBestTrend } from "./trendPicker";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!;
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function callOpenRouter(messages: ChatMessage[]) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/gpt-4.1", messages, temperature: 0.7, max_tokens: 800 }),
  });
  if (!res.ok) throw new Error("OpenRouter error");
  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

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

const CALENDAR_PLANNER = `
You are a Content Calendar Planner.
Return exactly N short daily angles, one per line.
No numbering, no markdown.
`;

const TIKTOK_HOOK = `TikTok hook. Short and punchy.`;
const TIKTOK_SCRIPT = `TikTok script 30-60s.`;
const YT_HOOK = `YouTube title + hook.`;
const YT_SCRIPT = `YouTube script outline.`;
const FB_HOOK = `Facebook post opener.`;
const FB_SCRIPT = `Facebook short story post.`;
const CTA_PROMPT = `Write 2-3 short CTAs.`;
const HASHTAG_STRATEGY_PROMPT = `
Generate hashtags in THREE groups:
Reach: #tag #tag #tag
Niche: #tag #tag #tag
Branded: #tag #tag #tag
`;
const UX_PROMPT = `Format into Hook/Script/CTA/Hashtags sections.`;
const FINAL_EDITOR = `Clean and output final content only.`;

async function hookAgent(p: string, t: string, tone: string, aud: string, lang: string, trend: string) {
  let sys = TIKTOK_HOOK; if (p==="youtube") sys=YT_HOOK; if (p==="facebook") sys=FB_HOOK;
  return callOpenRouter([{ role:"system", content: sys+lang+trend }, { role:"user", content:`Topic: ${t}\nAudience: ${aud}\nTone: ${tone}` }]);
}
async function scriptAgent(p: string, t: string, tone: string, aud: string, lang: string, trend: string) {
  let sys = TIKTOK_SCRIPT; if (p==="youtube") sys=YT_SCRIPT; if (p==="facebook") sys=FB_SCRIPT;
  return callOpenRouter([{ role:"system", content: sys+lang+trend }, { role:"user", content:`Topic: ${t}\nAudience: ${aud}\nTone: ${tone}` }]);
}
async function ctaAgent(t: string, lang: string) {
  return callOpenRouter([{ role:"system", content: CTA_PROMPT+lang }, { role:"user", content: t }]);
}
async function hashtagAgent(t: string, p: string, lang: string, trend: string) {
  return callOpenRouter([{ role:"system", content: HASHTAG_STRATEGY_PROMPT+lang+trend }, { role:"user", content:`Platform: ${p}\nTopic: ${t}` }]);
}
async function uxAgent(c: string, lang: string) {
  return callOpenRouter([{ role:"system", content: UX_PROMPT+lang }, { role:"user", content: c }]);
}
async function finalEditor(c: string, lang: string) {
  return callOpenRouter([{ role:"system", content: FINAL_EDITOR+lang }, { role:"user", content: c }]);
}

export async function handleCalendarCommand(text: string, userId?: string) {
  const raw = text;
  const wantsFull = /--full/i.test(raw);
  const wantsTrend = /--trend/i.test(raw);

  const cleaned = raw.replace(/--full/i, "").replace(/--trend/i, "").trim();
  const parts = cleaned.split(" ").slice(1);

  const profile = userId ? getUserProfile(String(userId)) : {};
  const lang = languageHint(profile.language);

  const known = ["tiktok","youtube","facebook","fb"];
  let p0 = (parts[0]||"").toLowerCase();
  let platform: string;
  if (known.includes(p0)) { platform=p0; parts.shift(); }
  else if (profile.platform) platform=profile.platform;
  else platform="tiktok";
  const normPlatform = platform==="fb"?"facebook":platform;

  let days = 7;
  const idx = parts.findIndex((p)=>/days$/i.test(p));
  if (idx>=0) { const n=parseInt(parts[idx].replace(/days/i,""),10); if(!isNaN(n)&&n>0&&n<=30) days=n; parts.splice(idx,1); }

  let topic = parts.join(" ").trim();
  if (!topic && profile.niche) topic = profile.niche;
  if (!topic) topic = "general topic";

  // ===== Auto Trend Picker per calendar =====
  let trendHint = "";
  if (wantsTrend) {
    const best = await pickBestTrend(topic, "general", normPlatform);
    if (best) trendHint = `\nBest trend to use: ${best}. Use it as inspiration.\n`;
  }

  const anglesText = await callOpenRouter([
    { role:"system", content: CALENDAR_PLANNER+lang+trendHint },
    { role:"user", content:`Topic: ${topic}\nDays: ${days}` },
  ]);

  const angles = anglesText
    .split("\n")
    .map((s: string)=>s.trim())
    .filter((s: string)=>s.length>0)
    .slice(0, days);

  if (!wantsFull) {
    return `Calendar Plan (${days} days) for ${normPlatform}:\n\n` + angles.map((a: string,i: number)=>`Day ${i+1}: ${a}`).join("\n");
  }

  const audience = "general";
  const tone = profile.tone || "energetic";
  let outputs: string[] = [];

  for (let i=0;i<angles.length;i++) {
    const dayTopic = angles[i];

    // Pick best trend for each day topic
    let dayTrendHint = trendHint;
    if (wantsTrend) {
      const bestDay = await pickBestTrend(dayTopic, audience, normPlatform);
      if (bestDay) dayTrendHint = `\nBest trend to use: ${bestDay}. Use it as inspiration.\n`;
    }

    let hook = await hookAgent(normPlatform, dayTopic, tone, audience, lang, dayTrendHint);
    let script = await scriptAgent(normPlatform, dayTopic, tone, audience, lang, dayTrendHint);
    let cta = await ctaAgent(dayTopic, lang);
    let hashtags = await hashtagAgent(dayTopic, normPlatform, lang, dayTrendHint);

    let combined = `
Day ${i+1}

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

  return outputs.join("\n\n====================\n\n");
}