import fs from "node:fs";
import { createHash } from "node:crypto";

const lockfilePath = "pnpm-lock.yaml";
const expectedSha256 = "ce984fcb21008b5210e35c76287752374de2fd262efd8e4e382939b60a443fff";
const failures = [];

if (!fs.existsSync(lockfilePath)) {
  failures.push(`Lockfile ausente: ${lockfilePath}`);
} else {
  const content = fs.readFileSync(lockfilePath);
  const text = content.toString("utf8");
  const actualSha256 = createHash("sha256").update(content).digest("hex");

  if (actualSha256 !== expectedSha256) {
    failures.push(`SHA-256 do lockfile divergiu: esperado ${expectedSha256}, obtido ${actualSha256}`);
  }
  for (const token of [
    "apps/messaging-gateway:",
    "'@whiskeysockets/baileys':",
    "specifier: 7.0.0-rc13",
    "version: 7.0.0-rc13(sharp@0.34.5)(supports-color@7.2.0)",
    "libsignal@6.0.0:",
    "whatsapp-rust-bridge@0.5.4:"
  ]) {
    if (!text.includes(token)) failures.push(`Entrada obrigatória ausente no lockfile: ${token}`);
  }
  const gatewayImporter = text.split("  apps/messaging-gateway:")[1]?.split("\npackages:")[0] || "";
  if (gatewayImporter.includes("latest") || /specifier:\s*[~^*]/.test(gatewayImporter)) {
    failures.push("Importer do gateway contém versão flutuante ou latest.");
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  contract: "messaging-w06-lockfile-v1",
  sha256: expectedSha256,
  package: "@whiskeysockets/baileys",
  version: "7.0.0-rc13",
  lifecycleScriptsExecuted: false,
  importer: "apps/messaging-gateway"
}, null, 2));
