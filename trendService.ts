// trendService.ts (Simple public trends fetcher) — Node 18+ uses global fetch

export async function getTrends(platform: string): Promise<string[]> {
  try {
    if (platform === "youtube") {
      const url = "https://www.youtube.com/feeds/trending.xml";
      const res = await fetch(url);
      const text = await res.text();

      const matches = [...text.matchAll(/<title>(.*?)<\/title>/g)]
        .map((m) => m[1])
        .filter((t) => t && !t.toLowerCase().includes("youtube"))
        .slice(0, 10);

      return matches;
    }

    // Default / TikTok / Facebook fallback: Google Trends
    const url = "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US";
    const res = await fetch(url);
    const text = await res.text();

    const matches = [...text.matchAll(/<title>(.*?)<\/title>/g)]
      .map((m) => m[1])
      .filter((t) => t && !t.toLowerCase().includes("daily search trends"))
      .slice(0, 10);

    return matches;
  } catch (err) {
    console.error("Trend fetch error:", err);
    return [];
  }
}