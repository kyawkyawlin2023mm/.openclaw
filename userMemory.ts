// userMemory.ts
import fs from "fs";
import path from "path";

export type UserProfile = {
  language?: "my" | "en";
  platform?: "tiktok" | "youtube" | "facebook";
  niche?: string;
  tone?: string;
};

const FILE_PATH = path.join(process.cwd(), "userProfiles.json");

function loadAll(): Record<string, UserProfile> {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify({}, null, 2));
    }
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, UserProfile>) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

export function getUserProfile(userId: string): UserProfile {
  const all = loadAll();
  return all[userId] || {};
}

export function updateUserProfile(userId: string, updates: UserProfile) {
  const all = loadAll();
  const current = all[userId] || {};
  all[userId] = { ...current, ...updates };
  saveAll(all);
}