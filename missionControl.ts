// missionControl.ts

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_KEY) {
  throw new Error("Missing OPENROUTER_API_KEY");
}

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

// 🧠 Agent Prompts
const BRAIN_PROMPT = `
You are the Brain Agent.
Analyze the user request and return a JSON plan.
Example:
{
  "steps": [
    {"agent": "content", "task": "do something"},
    {"agent": "ux", "task": "format result"},
    {"agent": "efficiency", "task": "optimize answer"}
  ]
}
Return ONLY JSON.
`;

const CONTENT_PROMPT = `
You are the Content Agent.
You generate the main content based on the task.
Be clear and useful.
`;

const UX_PROMPT = `
You are the UX Agent.
You improve formatting, clarity, and user experience.
Return a clean, nicely formatted final answer.
`;

const EFFICIENCY_PROMPT = `
You are the Efficiency Agent.
You shorten, optimize, and remove unnecessary parts.
Keep the answer useful but concise.
`;

// 🧠 Brain Agent
async function brainAgent(userMessage: string) {
  const reply = await callOpenRouter([
    { role: "system", content: BRAIN_PROMPT },
    { role: "user", content: userMessage },
  ]);

  try {
    return JSON.parse(reply);
  } catch {
    // fallback plan if model returns bad JSON
    return {
      steps: [
        { agent: "content", task: userMessage },
        { agent: "ux", task: "Format the result nicely" },
        { agent: "efficiency", task: "Optimize and shorten the answer" },
      ],
    };
  }
}

// ✍️ Content Agent
async function contentAgent(task: string) {
  return await callOpenRouter([
    { role: "system", content: CONTENT_PROMPT },
    { role: "user", content: task },
  ]);
}

// 🎨 UX Agent
async function uxAgent(task: string, input: string) {
  return await callOpenRouter([
    { role: "system", content: UX_PROMPT },
    { role: "user", content: `Task: ${task}\n\nContent:\n${input}` },
  ]);
}

// ⚡ Efficiency Agent
async function efficiencyAgent(task: string, input: string) {
  return await callOpenRouter([
    { role: "system", content: EFFICIENCY_PROMPT },
    { role: "user", content: `Task: ${task}\n\nContent:\n${input}` },
  ]);
}

// 🕹️ Mission Control
export async function handleMission(userMessage: string) {
  const plan = await brainAgent(userMessage);

  let currentResult = "";

  for (const step of plan.steps || []) {
    if (step.agent === "content") {
      currentResult = await contentAgent(step.task);
    } else if (step.agent === "ux") {
      currentResult = await uxAgent(step.task, currentResult);
    } else if (step.agent === "efficiency") {
      currentResult = await efficiencyAgent(step.task, currentResult);
    }
  }

  return currentResult || "No result generated.";
}