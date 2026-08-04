import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["app", "components", "lib", "apps"];
const allowedEngineDirectories = [
  "lib/messaging/adapters/baileys/",
  "apps/messaging-gateway/src/engines/baileys/"
];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const packageImportPattern = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'](?:@whiskeysockets\/baileys|baileys)(?:\/[^"']*)?["']/i;
const nativeTypePatterns = [
  /\bWAMessage\b/,
  /\bWAMessageKey\b/,
  /\bBinaryNode\b/,
  /\bproto\.Message\b/
];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return sourceExtensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function allowed(file) {
  return allowedEngineDirectories.some(prefix => file.startsWith(prefix));
}

const violations = [];
for (const sourceRoot of sourceRoots) {
  for (const absoluteFile of walk(path.join(root, sourceRoot))) {
    const file = relative(absoluteFile);
    if (allowed(file)) continue;
    const content = fs.readFileSync(absoluteFile, "utf8");
    if (packageImportPattern.test(content)) {
      violations.push(`${file}: import Baileys fora do adapter autorizado`);
    }
    for (const pattern of nativeTypePatterns) {
      if (pattern.test(content)) {
        violations.push(`${file}: tipo nativo ${pattern.source} fora do adapter autorizado`);
      }
    }
  }
}

if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      contract: "messaging-engine-boundary-v1",
      scannedRoots: sourceRoots.filter(item => fs.existsSync(path.join(root, item))),
      allowedEngineDirectories,
      forbiddenPackages: ["@whiskeysockets/baileys", "baileys"],
      forbiddenNativeTypes: ["WAMessage", "WAMessageKey", "BinaryNode", "proto.Message"]
    },
    null,
    2
  )
);
