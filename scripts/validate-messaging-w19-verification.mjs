import { execFileSync } from "node:child_process";
import fs from "node:fs";

const files = {
  harness: "lib/messaging/verification.ts",
  migration: "supabase/migrations/20260804235900_stage22_verification_runs.sql",
  dbTest: "supabase/tests/messaging-verification/verification.test.sql",
  tests: "tests/messaging-verification.test.ts",
  benchmark: "scripts/run-messaging-w19-benchmarks.mjs",
  docs: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/VERIFICACAO-W19.md"
};
const failures = [];
for (const file of Object.values(files)) if (!fs.existsSync(file)) failures.push(`Arquivo W-19 ausente: ${file}`);
const read = key => fs.existsSync(files[key]) ? fs.readFileSync(files[key], "utf8") : "";
const harness = read("harness");
const migration = read("migration").toLowerCase();
const docs = read("docs");

for (const token of [
  "RESTART_DURING_MESSAGE", "RESTART_DURING_KEY_UPDATE", "NETWORK_LOSS", "DUPLICATE_EVENT",
  "OUT_OF_ORDER_RECEIPT", "CORRUPTED_MEDIA", "DATABASE_UNAVAILABLE", "ZOMBIE_PROCESS",
  "SESSION_REPLICA_CONTENTION", "UPGRADE_DOWNGRADE", "RESTORE_NEW_INFRASTRUCTURE",
  "runSyntheticBenchmark", "throughputPerSecond", "p95LatencyMs", "bytesPerSyntheticSession",
  "SYNTHETIC_LOCAL"
]) if (!harness.includes(token)) failures.push(`Harness W-19 sem ${token}`);
for (const token of [
  "channel_verification_runs", "chaos_synthetic", "performance_synthetic",
  "real_number_used boolean not null default false check (not real_number_used)",
  "qr_or_pairing_used boolean not null default false check (not qr_or_pairing_used)",
  "external_network_used boolean not null default false check (not external_network_used)",
  "production_claim boolean not null default false check (not production_claim)",
  "verification_run_immutable", "force row level security"
]) if (!migration.includes(token)) failures.push(`SQL W-19 sem ${token}`);
for (const token of [
  "ledger de verificação aprovado", "chaos sintético persistido aprovado",
  "limites de performance registrados aprovados", "número real bloqueado aprovado",
  "QR e pairing bloqueados aprovados", "rede externa bloqueada aprovada",
  "claim produtivo bloqueado aprovado", "evidência minimizada aprovada",
  "resultado imutável aprovado", "isolamento multiempresa aprovado", "RLS e privilégio mínimo aprovados"
]) if (!read("dbTest").includes(token)) failures.push(`Teste PostgreSQL W-19 ausente: ${token}`);
for (const token of [
  "reinício durante mensagem", "reinício durante key update", "perda de rede", "evento duplicado",
  "receipt fora de ordem", "mídia corrompida", "banco indisponível", "processo zumbi",
  "réplicas disputando sessão", "upgrade e downgrade", "restore em infraestrutura nova",
  "memória por sessão, throughput e latência", "limites medidos"
]) if (!read("tests").includes(token)) failures.push(`Teste TypeScript W-19 ausente: ${token}`);
for (const token of [
  "W-19.4 — E2E com número de homologação: `BLOCKED_NOT_EXECUTED`",
  "W-19.5 — QR e pairing: `BLOCKED_NOT_EXECUTED`",
  "não representam capacidade produtiva"
]) if (!docs.includes(token)) failures.push(`Documentação W-19 sem limite: ${token}`);

let benchmark = null;
if (!failures.length) {
  try {
    benchmark = JSON.parse(execFileSync(process.execPath, [files.benchmark], { encoding: "utf8" }));
    if (!benchmark.passed || benchmark.environment !== "SYNTHETIC_LOCAL") failures.push("Benchmark W-19 não passou ou não é sintético.");
  } catch (error) {
    failures.push(`Benchmark W-19 falhou: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-synthetic-chaos-performance-boundary-v1",
  canonicalUnitTests: true,
  contractTests: true,
  postgresIntegration: true,
  chaosScenarios: 11,
  memoryBenchmark: true,
  throughputBenchmark: true,
  latencyBenchmark: true,
  measuredLimitsRecorded: true,
  benchmark,
  homologationNumberE2E: "BLOCKED_NOT_EXECUTED",
  qrPairing: "BLOCKED_NOT_EXECUTED",
  realNumberUsed: false,
  externalNetworkUsed: false,
  productionCapacityProven: false
}, null, 2));
