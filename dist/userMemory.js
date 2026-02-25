"use strict";
// userMemory.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = getUserProfile;
exports.updateUserProfile = updateUserProfile;
exports.markGood = markGood;
exports.markBad = markBad;
const memory = new Map();
function getUserProfile(userId) {
    if (!memory.has(userId)) {
        memory.set(userId, {
            language: "en",
            likes: 0,
            dislikes: 0,
        });
    }
    return memory.get(userId);
}
function updateUserProfile(userId, updates) {
    const current = getUserProfile(userId);
    memory.set(userId, { ...current, ...updates });
}
function markGood(userId) {
    const p = getUserProfile(userId);
    p.likes = (p.likes || 0) + 1;
    memory.set(userId, p);
}
function markBad(userId) {
    const p = getUserProfile(userId);
    p.dislikes = (p.dislikes || 0) + 1;
    memory.set(userId, p);
}
