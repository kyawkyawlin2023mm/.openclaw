// userMemory.ts (Profile + Performance Memory)

type Language = "my" | "en";

export type UserProfile = {
  platform?: string;
  niche?: string;
  tone?: string;
  language?: Language;

  // Performance memory
  likes?: number;
  dislikes?: number;
  preferredStyles?: string[]; // e.g. ["POV", "short-hook", "energetic"]
};

const store: Record<string, UserProfile> = {};

export function getUserProfile(userId: string): UserProfile {
  if (!store[userId]) {
    store[userId] = {
      likes: 0,
      dislikes: 0,
      preferredStyles: [],
    };
  }
  return store[userId];
}

export function updateUserProfile(userId: string, patch: Partial<UserProfile>) {
  const cur = getUserProfile(userId);
  store[userId] = { ...cur, ...patch };
}

export function markGood(userId: string) {
  const p = getUserProfile(userId);
  p.likes = (p.likes || 0) + 1;

  // reinforce styles
  const styles = new Set(p.preferredStyles || []);
  styles.add("short-hook");
  styles.add("energetic");
  styles.add("POV");
  p.preferredStyles = Array.from(styles);
}

export function markBad(userId: string) {
  const p = getUserProfile(userId);
  p.dislikes = (p.dislikes || 0) + 1;
}