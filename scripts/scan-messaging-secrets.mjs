import fs from "node:fs";
import path from "node:path";

const roots = ["app", "lib", "apps/messaging-gateway/src"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json"]);
const patterns = [
  { id: "PRIVATE_KEY", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { id: "OPENAI_KEY", pattern: /\bsk-(?:proj-)?[a-zA-Z0-9_-]{20,}\b/g },
  { id: "JWT_LITERAL", pattern: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g },
  { id: "SECRET_ASSIGNMENT", pattern: /\b(?:password|secret|token|cookie|privateKey|apiKey)\s*[:=]\s*["'][^"'\n]{12,}["']/gi }
];
const allowMarkers = ["process.env.", "[REDACTED", "example", "placeholder", "test-secret"];

function files(root) {
  if (!fs.existsSync(root)) return [];
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const location = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...files(location));
    else if (extensions.has(path.extname(entry.name)) && !entry.name.endsWith(".map")) output.push(location);
  }
  return output;
}

const findings = [];
for (const file of roots.flatMap(files)) {
  const content = fs.readFileSync(file, "utf8");
  for (const { id, pattern } of patterns) {
    for (const match of content.matchAll(pattern)) {
      const line = content.slice(0, match.index).split("\n").length;
      const context = content.slice(Math.max(0, match.index - 60), Math.min(content.length, match.index + match[0].length + 60));
      if (allowMarkers.some(marker => context.toLowerCase().includes(marker.toLowerCase()))) continue;
      findings.push({ file, line, rule: id });
    }
  }
}

if (findings.length) {
  console.error(JSON.stringify({ ok: false, findings }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-secret-scanner-v1",
  roots,
  filesScanned: roots.flatMap(files).length,
  findings: 0
}, null, 2));
