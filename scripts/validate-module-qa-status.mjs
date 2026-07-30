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
    if (!modules.some(module => module?.key === key)) errors.push(`Módulo do registry sem inventário QA: ${key}`);
  }

  for (const module of modules) {
    if (!module || typeof module !== "object") {
      errors.push("Entrada de módulo inválida.");
      continue;
    }

    if (!module.key || typeof module.key !== "string") errors.push("Módulo sem key.");
    else if (keys.has(module.key)) errors.push(`Módulo duplicado: ${module.key}`);
    else keys.add(module.key);

    if (!module.name || typeof module.name !== "string") errors.push(`${module.key ?? "?"}: name ausente.`);
    if (!module.route || typeof module.route !== "string" || !module.route.startsWith("/")) errors.push(`${module.key ?? "?"}: route inválida.`);
    if (!module.persona || typeof module.persona !== "string") errors.push(`${module.key ?? "?"}: persona ausente.`);
    if (!allowedStatuses.has(module.status)) errors.push(`${module.key ?? "?"}: status não permitido: ${module.status}`);
    if (!Number.isInteger(module.iterations) || module.iterations < 0) errors.push(`${module.key ?? "?"}: iterations inválido.`);
    if (!Array.isArray(module.acceptance) || module.acceptance.length === 0) errors.push(`${module.key ?? "?"}: critérios de aceitação ausentes.`);
    if (!Array.isArray(module.resolvedProblems)) errors.push(`${module.key ?? "?"}: resolvedProblems precisa ser array.`);
    if (!Array.isArray(module.approvedCaptures)) errors.push(`${module.key ?? "?"}: approvedCaptures precisa ser array.`);
    if (!Array.isArray(module.vaccines) || !module.vaccines.includes("VACINA-043")) errors.push(`${module.key ?? "?"}: VACINA-043 ausente.`);

    if (module.status === "aprovado") {
      if (module.iterations < 1) errors.push(`${module.key}: aprovado sem iteração executada.`);
      if (module.approvedCaptures.length < 6) errors.push(`${module.key}: aprovado sem as seis capturas mínimas.`);
      if (module.runtimeLogsReviewed !== true) errors.push(`${module.key}: aprovado sem revisão dos logs do servidor.`);
      if (module.browserConsoleReviewed !== true) errors.push(`${module.key}: aprovado sem revisão do console do navegador.`);

      for (const capture of module.approvedCaptures) {
        if (!capture || typeof capture !== "object") {
          errors.push(`${module.key}: captura aprovada sem metadados.`);
          continue;
        }
        for (const field of ["url", "viewport", "theme", "persona", "previewCommit", "decision"]) {
          if (!capture[field]) errors.push(`${module.key}: captura sem ${field}.`);
        }
        if (!requiredViewports.has(capture.viewport)) errors.push(`${module.key}: viewport não homologado: ${capture.viewport}`);
        if (!requiredThemes.has(capture.theme)) errors.push(`${module.key}: tema não homologado: ${capture.theme}`);
        if (capture.decision !== "aprovado") errors.push(`${module.key}: captura final sem decisão aprovada.`);
        if (Array.isArray(capture.findings) && capture.findings.length > 0) errors.push(`${module.key}: captura aprovada ainda possui achados.`);
      }
    }
  }

  const requireAll = process.argv.includes("--require-all-approved");
  if (requireAll) {
    const pending = modules.filter(module => module.status !== "aprovado").map(module => module.key);
    if (pending.length) errors.push(`Campanha ainda não concluída: ${pending.join(", ")}`);
  }
}

if (errors.length) {
  console.error(`Inventário QA inválido (${errors.length} falha(s)):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const approved = document.modules.filter(module => module.status === "aprovado").length;
console.log(`Inventário QA válido: ${document.modules.length} módulos, ${approved} aprovado(s).`);
