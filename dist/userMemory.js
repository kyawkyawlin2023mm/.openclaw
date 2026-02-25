"use strict";
// userMemory.ts (Profile + Performance Memory)
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = getUserProfile;
exports.updateUserProfile = updateUserProfile;
exports.markGood = markGood;
exports.markBad = markBad;
const store = {};
function getUserProfile(userId) {
    if (!store[userId]) {
        store[userId] = {
            likes: 0,
            dislikes: 0,
            preferredStyles: [],
        };
    }
    return store[userId];
}
function updateUserProfile(userId, patch) {
    const cur = getUserProfile(userId);
    store[userId] = { ...cur, ...patch };
}
function markGood(userId) {
    const p = getUserProfile(userId);
    p.likes = (p.likes || 0) + 1;
    // reinforce styles
    const styles = new Set(p.preferredStyles || []);
    styles.add("short-hook");
    styles.add("energetic");
    styles.add("POV");
    p.preferredStyles = Array.from(styles);
}
function markBad(userId) {
    const p = getUserProfile(userId);
    p.dislikes = (p.dislikes || 0) + 1;
}
