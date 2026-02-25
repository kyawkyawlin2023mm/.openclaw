// trendService.ts — Live fetch (if possible) + Fallback

export async function getTrends(platform: string): Promise<string[]> {
  try {
    // If you later add a real API, call it here.
    // For now, force fallback (VPS often blocks Google Trends RSS).
    throw new Error("Google Trends RSS blocked");
  } catch (err) {
    console.warn("Trend fetch error, using fallback:", err);
    return fallbackTrends(platform);
  }
}

function fallbackTrends(platform: string): string[] {
  const common: string[] = [
    "AI voice clone videos",
    "Before vs After transformations",
    "Daily routine vlog",
    "Motivation quotes short video",
    "Funny reaction clips",
    "Life hacks in 30 seconds",
    "Street food ASMR",
    "Travel cinematic reels",
    "Fitness progress challenge",
  ];

  if (platform === "tiktok") {
    return [
      "BMW motorcycle POV rides",
      "POV ride with engine sound",
      "Quick cuts cinematic ride",
      ...common,
    ];
  }

  if (platform === "youtube") {
    return [
      "Long-form BMW ride vlog",
      "Motorcycle maintenance tutorial",
      "Cinematic travel moto film",
      ...common,
    ];
  }

  if (platform === "facebook") {
    return [
      "Story-style bike journey",
      "Before vs After bike upgrade",
      "Motivation biker story",
      ...common,
    ];
  }

  return common;
}