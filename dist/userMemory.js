"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfile = getUserProfile;
exports.updateUserProfile = updateUserProfile;
// userMemory.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const FILE_PATH = path_1.default.join(process.cwd(), "userProfiles.json");
function loadAll() {
    try {
        if (!fs_1.default.existsSync(FILE_PATH)) {
            fs_1.default.writeFileSync(FILE_PATH, JSON.stringify({}, null, 2));
        }
        const raw = fs_1.default.readFileSync(FILE_PATH, "utf-8");
        return JSON.parse(raw || "{}");
    }
    catch {
        return {};
    }
}
function saveAll(data) {
    fs_1.default.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}
function getUserProfile(userId) {
    const all = loadAll();
    return all[userId] || {};
}
function updateUserProfile(userId, updates) {
    const all = loadAll();
    const current = all[userId] || {};
    all[userId] = { ...current, ...updates };
    saveAll(all);
}
