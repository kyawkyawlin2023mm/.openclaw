// userMemory.ts

type UserProfile = {
  language?: "my" | "en";
  platform?: string;
  niche?: string;
  tone?: string;
  likes?: number;
  dislikes?: number;
};

const memory = new Map<string, UserProfile>();

export function getUserProfile(userId: string): UserProfile {
  if (!memory.has(userId)) {
    memory.set(userId, {
      language: "en",
      likes: 0,
      dislikes: 0,
    });
  }
  return memory.get(userId)!;
}

export function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const current = getUserProfile(userId);
  memory.set(userId, { ...current, ...updates });
}

export function markGood(userId: string) {
  const p = getUserProfile(userId);
  p.likes = (p.likes || 0) + 1;
  memory.set(userId, p);
}

export function markBad(userId: string) {
  const p = getUserProfile(userId);
  p.dislikes = (p.dislikes || 0) + 1;
  memory.set(userId, p);
}