// trendService.ts — Node 18+ uses global fetch

function extractTitles(xml: string): string[] {
  const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)]
    .map((m) => m[1].trim())
    .filter((t) => t && !/youtube|daily search trends|google trends/i.test(t));
  return titles;
}

export async function getTrends(platform: string): Promise<string[]> {
  try {
    if (platform === "youtube") {
      const url = "https://www.youtube.com/feeds/trending.xml";
      const res = await fetch(url);
      if (!res.ok) throw new Error("YouTube RSS error");
      const text = await res.text();
      const titles = extractTitles(text).slice(0, 10);
      return titles.length ? titles : [];
    }

    // Fallback for tiktok/facebook/others: Google Trends Daily RSS
    const url = "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Google Trends RSS error");
    const text = await res.text();
    const titles = extractTitles(text).slice(0, 10);
    return titles.length ? titles : [];
  } catch (err) {
    console.error("Trend fetch error:", err);
    return [];
  }
}