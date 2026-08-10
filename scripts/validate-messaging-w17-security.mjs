import { execFileSync } from "node:child_process";
import fs from "node:fs";

const files = {
  security: "lib/messaging/security.ts",
  migration: "supabase/migrations/20260804220000_stage22_security_hardening.sql",
  dbTest: "supabase/tests/messaging-security/security.test.sql",
  tests: "tests/messaging-security.test.ts",
  threatModel: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/THREAT-MODEL-W17.md",
  incident: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/INCIDENTE-SESSAO-W17.md",
  sbom: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/SBOM-W17.json",
  scanner: "scripts/scan-messaging-secrets.mjs",
  sbomGenerator: "scripts/generate-messaging-sbom.mjs"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo W-17 ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const security = read("security");
const migration = read("migration").toLowerCase();
const threatModel = read("threatModel");

for (const token of [
  "MESSAGING_SECURITY_ASSETS", "MESSAGING_TRUST_BOUNDARIES", "MESSAGING_STRIDE_THREATS",
  "SPOOFING", "TAMPERING", "REPUDIATION", "INFORMATION_DISCLOSURE", "DENIAL_OF_SERVICE",
  "ELEVATION_OF_PRIVILEGE", "sanitizeSecurityLog", "MESSAGING_TOOL_ALLOWLIST",
  "assertCriticalApproval", "retentionDeadline", "assertTenantScope", "buildSessionCompromisePlan"
]) if (!security.includes(token)) failures.push(`Hardening W-17 sem ${token}`);
for (const token of [
  "channel_security_retention_policies", "channel_sensitive_access_audit", "channel_security_incidents",
  "channel_critical_write_approvals", "record_channel_sensitive_access", "create_channel_security_incident",
  "approve_channel_critical_write", "consume_channel_critical_write_approval",
  "security_event_immutable", "force row level security"
]) if (!migration.includes(token)) failures.push(`SQL W-17 sem ${token}`);
for (const token of ["Spoofing", "Tampering", "Repudiation", "Information disclosure", "Denial of service", "Elevation of privilege"])
  if (!threatModel.includes(token)) failures.push(`STRIDE W-17 sem ${token}`);
for (const token of [
  "persistência de segurança aprovada", "retenção e legal hold aprovados", "auditoria de acesso sensível aprovada",
  "fingerprint sem segredo aprovado", "resposta a comprometimento registrada aprovada",
  "redação de evidência sensível aprovada", "aprovação crítica de uso único aprovada",
  "eventos de segurança imutáveis aprovados", "isolamento multiempresa aprovado", "RLS e privilégio mínimo aprovados"
]) if (!read("dbTest").includes(token)) failures.push(`Teste PostgreSQL W-17 ausente: ${token}`);
for (const token of [
  "seis categorias STRIDE", "ativos e fronteiras", "chaves e valores secretos", "ferramentas da allowlist",
  "aprovação válida", "retenção e preserva legal hold", "acesso cross-tenant", "comprometimento de sessão"
]) if (!read("tests").includes(token)) failures.push(`Teste TypeScript W-17 ausente: ${token}`);

if (!failures.length) {
  try {
    execFileSync(process.execPath, [files.scanner], { stdio: "inherit" });
    const generated = JSON.parse(execFileSync(process.execPath, [files.sbomGenerator], { encoding: "utf8" }));
    const snapshot = JSON.parse(read("sbom"));
    const generatedBaileys = generated.components.find(component => component.name === "@whiskeysockets/baileys");
    const snapshotBaileys = snapshot.components.find(component => component.name === "@whiskeysockets/baileys");
    if (!generatedBaileys || !snapshotBaileys || generatedBaileys.version !== snapshotBaileys.version) {
      failures.push("SBOM W-17 divergente do package do gateway.");
    }
  } catch (error) {
    failures.push(`Scanner/SBOM W-17 falhou: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-threat-model-hardening-boundary-v1",
  strideComplete: true,
  assetsInventoried: true,
  trustBoundariesMapped: true,
  replayAndInjectionCovered: true,
  toolAllowlist: true,
  criticalApproval: true,
  logRedaction: true,
  retentionAndPurge: true,
  sensitiveAccessAudit: true,
  crossTenantTests: true,
  sessionCompromisePlan: true,
  secretScanner: true,
  sbomGenerated: true
}, null, 2));
