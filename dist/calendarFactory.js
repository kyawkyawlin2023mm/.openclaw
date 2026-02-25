"use strict";
// calendarFactory.ts — Pro Calendar Auto-Fill
// Usage: /calendar 7days --trend --short --brand
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCalendarCommand = handleCalendarCommand;
const contentFactory_1 = require("./contentFactory");
function parseDays(text) {
    const m = text.match(/(\d+)\s*days/i);
    if (!m)
        return 7;
    const n = parseInt(m[1], 10);
    if (isNaN(n) || n < 1)
        return 7;
    return Math.min(n, 30);
}
async function handleCalendarCommand(text, userId) {
    const days = parseDays(text);
    const flags = [];
    if (text.includes("--trend"))
        flags.push("--trend");
    if (text.includes("--short"))
        flags.push("--short");
    if (text.includes("--brand"))
        flags.push("--brand");
    const baseTopic = text
        .replace("/calendar", "")
        .replace(/--\w+/g, "")
        .replace(/\d+\s*days/i, "")
        .trim();
    const topic = baseTopic || "content ideas";
    let output = `📅 ${days}-Day Content Plan\n\n`;
    for (let d = 1; d <= days; d++) {
        const cmd = `/content ${topic} ${flags.join(" ")}`.trim();
        const content = await (0, contentFactory_1.handleContentCommand)(cmd, userId);
        output += `Day ${d}:\n${content}\n\n---\n\n`;
    }
    return output.trim();
}
