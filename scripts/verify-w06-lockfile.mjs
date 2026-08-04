import fs from "node:fs";
import { createHash } from "node:crypto";

const lockfilePath = "pnpm-lock.yaml";
const gatewayPackagePath = "apps/messaging-gateway/package.json";
const expectedVersion = "7.0.0-rc13";
const expectedSemanticSha256 = "32ab30145c9c045d8f04860ccb52b85934f0327313099f2e837ec502d4977ff4";
const approvedFullArtifactSha256 = "d681efc5acb88940b5a81f2019808ed5ef9d8cde9fa8d36d178076423dc35ed9";
const failures = [];

function normalize(text) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "");
}

function importerBlock(text, importer) {
  const marker = `  ${importer}:`;
  const start = text.indexOf(marker);
  if (start < 0) return "";
  const end = text.indexOf("\npackages:", start);
  return text.slice(start, end < 0 ? text.length : end).trim();
}

function twoSpaceBlock(text, marker) {
  const start = text.indexOf(marker);
  if (start < 0) return "";
  const remainder = text.slice(start + marker.length);
  const next = remainder.search(/\n  (?=[^ \n])/);
  const end = next < 0 ? text.length : start + marker.length + next;
  return text.slice(start, end).trim();
}

if (!fs.existsSync(lockfilePath)) failures.push(`Lockfile ausente: ${lockfilePath}`);
if (!fs.existsSync(gatewayPackagePath)) failures.push(`Manifesto do gateway ausente: ${gatewayPackagePath}`);

let semanticSha256 = "";
if (failures.length === 0) {
  const text = normalize(fs.readFileSync(lockfilePath, "utf8"));
  const gatewayPackage = JSON.parse(fs.readFileSync(gatewayPackagePath, "utf8"));
  const declared = gatewayPackage.dependencies?.["@whiskeysockets/baileys"];

  if (declared !== expectedVersion) {
    failures.push(`Gateway deve declarar Baileys exatamente ${expectedVersion}; encontrado ${String(declared)}`);
  }

  const blocks = [
    importerBlock(text, "apps/messaging-gateway"),
    twoSpaceBlock(text, "  '@whiskeysockets/baileys@7.0.0-rc13':"),
    twoSpaceBlock(text, "  libsignal@6.0.0:"),
    twoSpaceBlock(text, "  whatsapp-rust-bridge@0.5.4:"),
    twoSpaceBlock(text, "  '@whiskeysockets/baileys@7.0.0-rc13(sharp@0.34.5)(supports-color@7.2.0)':")
  ];

  const blockNames = [
    "importer apps/messaging-gateway",
    "pacote Baileys",
    "pacote libsignal",
    "pacote whatsapp-rust-bridge",
    "snapshot Baileys"
  ];
  blocks.forEach((block, index) => {
    if (!block) failures.push(`Bloco semântico ausente no lockfile: ${blockNames[index]}`);
  });

  const semanticText = `${blocks.join("\n---\n")}\n`;
  for (const token of [
    "specifier: 7.0.0-rc13",
    "version: 7.0.0-rc13(sharp@0.34.5)(supports-color@7.2.0)",
    "resolution: {integrity: sha512-8JPc8gaaCRykkjW2jxLGQ7/RZGrc7awO7WU+QJocf58eSUI9jAdcuYLynzhAbyU4UWvJJsHImZ+5E/JaZj5ypA==}",
    "resolution: {integrity: sha512-d/5V3YFtDljbFMufz4ncyUYGYhJl+vzAe+c2EFFBQ6bz1h8Q3IOMEGXYMzlibU60I+e8GagMMpji18iez3P1hA==}",
    "resolution: {integrity: sha512-yYO1qSs0Fe7tGtnxOFHomocUD6IZtoAgmA4oDFyGIRZ67D3QZk3w7swA6XXFXNQngiyrg2k7tul6IrM3eUFh7A==}",
    "libsignal: 6.0.0",
    "whatsapp-rust-bridge: 0.5.4",
    "protobufjs: 7.6.5",
    "pino: 9.14.0",
    "ws: 8.21.1"
  ]) {
    if (!semanticText.includes(token)) failures.push(`Cadeia W-06 sem entrada aprovada: ${token}`);
  }

  const gatewayImporter = blocks[0] || "";
  if (gatewayImporter.includes("latest") || /specifier:\s*[~^*]/.test(gatewayImporter)) {
    failures.push("Importer do gateway contém versão flutuante ou latest.");
  }

  semanticSha256 = createHash("sha256").update(semanticText).digest("hex");
  if (semanticSha256 !== expectedSemanticSha256) {
    failures.push(`Fingerprint semântico W-06 divergiu: esperado ${expectedSemanticSha256}, obtido ${semanticSha256}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  contract: "messaging-w06-lockfile-v2",
  validationScope: "gateway_importer_baileys_package_integrities_and_snapshot",
  semanticSha256,
  approvedFullArtifactSha256,
  package: "@whiskeysockets/baileys",
  version: expectedVersion,
  lifecycleScriptsExecuted: false,
  importer: "apps/messaging-gateway",
  unrelatedWorkspaceResolutionDriftIgnored: true
}, null, 2));
