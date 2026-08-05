import fs from "node:fs";

const statusPath = "docs/qa/module-validation-status.json";
const registryPath = "lib/modules/registry.ts";
const errors = [];

function read(path) {
  if (!fs.existsSync(path)) {
    errors.push(`Arquivo ausente: ${path}`);
    return "";
  }
  return fs.readFileSync(path, "utf8");
}

const rawStatus = read(statusPath);
const registry = read(registryPath);
let document;

try {
  document = JSON.parse(rawStatus);
} catch (error) {
  errors.push(`JSON de homologação inválido: ${error instanceof Error ? error.message : String(error)}`);
}

if (document) {
  const allowedStatuses = new Set(document.allowedStatuses ?? []);
  const requiredViewports = new Set(document.requiredViewports ?? []);
  const requiredThemes = new Set(document.requiredThemes ?? []);
  const modules = Array.isArray(document.modules) ? document.modules : [];
  const keys = new Set();

  for (const required of ["1920x1080", "1366x768", "390x844"]) {
    if (!requiredViewports.has(required)) errors.push(`Viewport obrigatório ausente: ${required}`);
  }
  for (const required of ["claro", "escuro"]) {
    if (!requiredThemes.has(required)) errors.push(`Tema obrigatório ausente: ${required}`);
  }

  const registryKeys = [...registry.matchAll(/\{\s*key:\s*"([^"]+)"/g)].map(match => match[1]);
  for (const key of registryKeys) {
    if (!modules.some(moduleEntry => moduleEntry?.key === key)) errors.push(`Módulo do registry sem inventário QA: ${key}`);
  }

  for (const moduleEntry of modules) {
    if (!moduleEntry || typeof moduleEntry !== "object") {
      errors.push("Entrada de módulo inválida.");
      continue;
    }

    if (!moduleEntry.key || typeof moduleEntry.key !== "string") errors.push("Módulo sem key.");
    else if (keys.has(moduleEntry.key)) errors.push(`Módulo duplicado: ${moduleEntry.key}`);
    else keys.add(moduleEntry.key);

    if (!moduleEntry.name || typeof moduleEntry.name !== "string") errors.push(`${moduleEntry.key ?? "?"}: name ausente.`);
    if (!moduleEntry.route || typeof moduleEntry.route !== "string" || !moduleEntry.route.startsWith("/")) errors.push(`${moduleEntry.key ?? "?"}: route inválida.`);
    if (!moduleEntry.persona || typeof moduleEntry.persona !== "string") errors.push(`${moduleEntry.key ?? "?"}: persona ausente.`);
    if (!allowedStatuses.has(moduleEntry.status)) errors.push(`${moduleEntry.key ?? "?"}: status não permitido: ${moduleEntry.status}`);
    if (!Number.isInteger(moduleEntry.iterations) || moduleEntry.iterations < 0) errors.push(`${moduleEntry.key ?? "?"}: iterations inválido.`);
    if (!Array.isArray(moduleEntry.acceptance) || moduleEntry.acceptance.length === 0) errors.push(`${moduleEntry.key ?? "?"}: critérios de aceitação ausentes.`);
    if (!Array.isArray(moduleEntry.resolvedProblems)) errors.push(`${moduleEntry.key ?? "?"}: resolvedProblems precisa ser array.`);
    if (!Array.isArray(moduleEntry.approvedCaptures)) errors.push(`${moduleEntry.key ?? "?"}: approvedCaptures precisa ser array.`);
    if (!Array.isArray(moduleEntry.vaccines) || !moduleEntry.vaccines.includes("VACINA-043")) errors.push(`${moduleEntry.key ?? "?"}: VACINA-043 ausente.`);

    if (moduleEntry.status === "aprovado") {
      if (moduleEntry.iterations < 1) errors.push(`${moduleEntry.key}: aprovado sem iteração executada.`);
      if (moduleEntry.approvedCaptures.length < 6) errors.push(`${moduleEntry.key}: aprovado sem as seis capturas mínimas.`);
      if (moduleEntry.runtimeLogsReviewed !== true) errors.push(`${moduleEntry.key}: aprovado sem revisão dos logs do servidor.`);
      if (moduleEntry.browserConsoleReviewed !== true) errors.push(`${moduleEntry.key}: aprovado sem revisão do console do navegador.`);

      for (const capture of moduleEntry.approvedCaptures) {
        if (!capture || typeof capture !== "object") {
          errors.push(`${moduleEntry.key}: captura aprovada sem metadados.`);
          continue;
        }
        for (const field of ["url", "viewport", "theme", "persona", "previewCommit", "decision"]) {
          if (!capture[field]) errors.push(`${moduleEntry.key}: captura sem ${field}.`);
        }
        if (!requiredViewports.has(capture.viewport)) errors.push(`${moduleEntry.key}: viewport não homologado: ${capture.viewport}`);
        if (!requiredThemes.has(capture.theme)) errors.push(`${moduleEntry.key}: tema não homologado: ${capture.theme}`);
        if (capture.decision !== "aprovado") errors.push(`${moduleEntry.key}: captura final sem decisão aprovada.`);
        if (Array.isArray(capture.findings) && capture.findings.length > 0) errors.push(`${moduleEntry.key}: captura aprovada ainda possui achados.`);
      }
    }
  }

  const requireAll = process.argv.includes("--require-all-approved");
  if (requireAll) {
    const pending = modules.filter(moduleEntry => moduleEntry.status !== "aprovado").map(moduleEntry => moduleEntry.key);
    if (pending.length) errors.push(`Campanha ainda não concluída: ${pending.join(", ")}`);
  }
}

if (errors.length) {
  console.error(`Inventário QA inválido (${errors.length} falha(s)):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const approved = document.modules.filter(moduleEntry => moduleEntry.status === "aprovado").length;
console.log(`Inventário QA válido: ${document.modules.length} módulos, ${approved} aprovado(s).`);
