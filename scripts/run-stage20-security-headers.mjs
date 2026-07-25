import fs from "node:fs";
import { createHash } from "node:crypto";

const reportPath = "stage20-security-headers-report.json";
const appUrl = process.env.SECURITY_HEADERS_URL?.trim() || process.env.HOMOLOGATION_APP_URL?.trim() || "";
const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ?? "";
const timeoutMs = Number(process.env.SECURITY_HEADERS_TIMEOUT_MS ?? 30_000);
const probePath = process.env.SECURITY_HEADERS_PATH?.trim() || "/login";

// A CSP só protege se for entregue aplicada. Report-Only foi o estado anterior e
// não pode voltar sem que este job reprove.
const requiredDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'"
];

// Sem estas origens a política derruba funcionalidade existente: o PDF de
// assinatura e o de documentos são exibidos em iframe apontando para URL
// assinada do storage, e a mídia do diário de obra vem da mesma origem.
const requiredSources = [
  { directive: "frame-src", source: "https://*.supabase.co" },
  { directive: "connect-src", source: "https://*.supabase.co" },
  { directive: "img-src", source: "https://*.supabase.co" },
  { directive: "media-src", source: "https://*.supabase.co" }
];

const requiredHeaders = [
  { name: "x-content-type-options", expected: "nosniff" },
  { name: "x-frame-options", expected: "DENY" },
  { name: "referrer-policy", expected: "strict-origin-when-cross-origin" }
];

const report = {
  schemaVersion: 1,
  status: "running",
  mode: "security_headers_https",
  startedAt: new Date().toISOString(),
  checks: []
};
let failure = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function endpointFingerprint(url) {
  return createHash("sha256").update(`${url.origin}${url.pathname}`).digest("hex").slice(0, 16);
}

function parseDirectives(policy) {
  const map = new Map();
  for (const chunk of policy.split(";")) {
    const parts = chunk.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) continue;
    map.set(parts[0].toLowerCase(), parts.slice(1));
  }
  return map;
}

try {
  assert(appUrl, "Defina SECURITY_HEADERS_URL ou HOMOLOGATION_APP_URL.");
  assert(vercelBypass.length >= 32, "VERCEL_AUTOMATION_BYPASS_SECRET deve possuir ao menos 32 caracteres.");
  assert(Number.isFinite(timeoutMs) && timeoutMs >= 1_000 && timeoutMs <= 120_000, "SECURITY_HEADERS_TIMEOUT_MS inválido.");

  const base = new URL(appUrl);
  assert(base.protocol === "https:", "A verificação de cabeçalhos exige HTTPS.");
  const endpoint = new URL(probePath, base);
  endpoint.search = "";
  endpoint.hash = "";
  report.endpointFingerprint = endpointFingerprint(endpoint);

  const response = await fetch(endpoint, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "text/html", "x-vercel-protection-bypass": vercelBypass }
  });

  report.response = { httpStatus: response.status };
  assert(response.status < 400, `A página de sondagem retornou HTTP ${response.status}.`);
  report.checks.push({ name: "deployment_protection_bypass", ok: true });

  const enforced = response.headers.get("content-security-policy");
  const reportOnly = response.headers.get("content-security-policy-report-only");
  report.csp = { enforced: Boolean(enforced), reportOnlyPresent: Boolean(reportOnly) };
  assert(enforced, reportOnly
    ? "A CSP voltou a ser entregue apenas como Report-Only."
    : "Nenhum cabeçalho Content-Security-Policy foi entregue.");

  const directives = parseDirectives(enforced);
  report.csp.directives = [...directives.keys()];

  const missingDirectives = requiredDirectives.filter(entry => {
    const [name, ...values] = entry.split(/\s+/);
    const present = directives.get(name.toLowerCase());
    return !present || !values.every(value => present.includes(value));
  });
  assert(missingDirectives.length === 0, `CSP sem diretivas obrigatórias: ${missingDirectives.join(", ")}.`);
  report.checks.push({ name: "csp_baseline_directives", ok: true });

  const missingSources = requiredSources.filter(({ directive, source }) => {
    const values = directives.get(directive) ?? directives.get("default-src");
    return !values || !values.includes(source);
  });
  assert(missingSources.length === 0,
    `CSP sem origem necessária: ${missingSources.map(item => `${item.directive} ${item.source}`).join(", ")}. ` +
    "Nesta configuração o visualizador de assinatura, o de documentos ou a mídia do diário param de carregar.");
  report.checks.push({ name: "csp_required_sources", ok: true });

  const headerProblems = requiredHeaders
    .map(({ name, expected }) => ({ name, expected, actual: response.headers.get(name) }))
    .filter(item => (item.actual ?? "").toLowerCase() !== item.expected.toLowerCase());
  assert(headerProblems.length === 0,
    `Cabeçalhos de segurança divergentes: ${headerProblems.map(item => `${item.name}=${item.actual ?? "ausente"}`).join(", ")}.`);
  report.checks.push({ name: "baseline_security_headers", ok: true });

  const hsts = response.headers.get("strict-transport-security");
  report.checks.push({ name: "strict_transport_security", ok: Boolean(hsts), value: hsts ? "present" : "absent" });
  assert(hsts, "Strict-Transport-Security ausente na resposta HTTPS.");

  report.status = "passed";
  report.finishedAt = new Date().toISOString();
} catch (error) {
  failure = error instanceof Error ? error : new Error(String(error));
  report.status = "failed";
  report.finishedAt = new Date().toISOString();
  report.error = failure.message.slice(0, 1000);
} finally {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}

if (failure) throw failure;
