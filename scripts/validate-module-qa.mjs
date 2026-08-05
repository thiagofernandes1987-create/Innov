import fs from "node:fs";

const registryPath = "lib/modules/registry.ts";
const inventoryPath = "diretrizes/qa/VALIDACAO-MODULOS.json";
const protocolPath = "docs/CICLO-AJUSTE-VALIDACAO-MODULOS.md";
const errors = [];

for (const path of [registryPath, inventoryPath, protocolPath]) {
  if (!fs.existsSync(path)) errors.push(`Arquivo obrigatório ausente: ${path}`);
}

if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const registrySource = fs.readFileSync(registryPath, "utf8");
const registryKeys = [...registrySource.matchAll(/\{\s*key:"([^"]+)"/g)].map((match) => match[1]);
if (!registryKeys.length) errors.push("Nenhum módulo foi extraído de lib/modules/registry.ts.");

let inventory;
try {
  inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
} catch (error) {
  errors.push(`Inventário JSON inválido: ${error instanceof Error ? error.message : String(error)}`);
}

const allowedStatuses = new Set([
  "pendente",
  "em_correcao",
  "aguardando_preview",
  "aguardando_captura",
  "reprovado",
  "aprovado"
]);

if (inventory) {
  if (inventory.schemaVersion !== 1) errors.push("schemaVersion de VALIDACAO-MODULOS.json deve ser 1.");
  if (inventory.repository !== "thiagofernandes1987-create/Innov") errors.push("Inventário aponta para repositório incorreto.");
  if (!Array.isArray(inventory.modules)) errors.push("Inventário sem array modules.");
  if (!Array.isArray(inventory.requiredViewports) || inventory.requiredViewports.length < 3) errors.push("Inventário sem os três viewports mínimos.");
  if (!Array.isArray(inventory.requiredThemes) || !inventory.requiredThemes.includes("claro") || !inventory.requiredThemes.includes("escuro")) errors.push("Inventário precisa exigir temas claro e escuro.");
  if (!Array.isArray(inventory.requiredAcceptanceCriteria) || inventory.requiredAcceptanceCriteria.length < 10) errors.push("Inventário sem critérios de aceitação suficientes.");

  const moduleRecords = Array.isArray(inventory.modules) ? inventory.modules : [];
  const moduleKeys = moduleRecords.map((moduleRecord) => moduleRecord?.modulo);
  const duplicates = moduleKeys.filter((key, index) => moduleKeys.indexOf(key) !== index);
  if (duplicates.length) errors.push(`Módulos duplicados no inventário: ${[...new Set(duplicates)].join(", ")}`);

  for (const key of registryKeys) {
    if (!moduleKeys.includes(key)) errors.push(`Módulo do registro ausente no inventário QA: ${key}`);
  }
  for (const key of moduleKeys) {
    if (!registryKeys.includes(key)) errors.push(`Inventário QA contém módulo inexistente no registro: ${key}`);
  }

  const requiredCriteria = Array.isArray(inventory.requiredAcceptanceCriteria)
    ? inventory.requiredAcceptanceCriteria
    : [];
  const requiredViewports = Array.isArray(inventory.requiredViewports)
    ? inventory.requiredViewports
    : [];
  const requiredThemes = Array.isArray(inventory.requiredThemes)
    ? inventory.requiredThemes
    : [];

  for (const moduleRecord of moduleRecords) {
    const label = moduleRecord?.modulo ?? "<sem-modulo>";
    if (typeof moduleRecord?.nome !== "string" || !moduleRecord.nome.trim()) errors.push(`${label}: nome ausente.`);
    if (typeof moduleRecord?.rotaPrincipal !== "string" || !moduleRecord.rotaPrincipal.startsWith("/app")) errors.push(`${label}: rotaPrincipal inválida.`);
    if (typeof moduleRecord?.personaPrincipal !== "string" || !moduleRecord.personaPrincipal.trim()) errors.push(`${label}: personaPrincipal ausente.`);
    if (typeof moduleRecord?.fluxoPrincipal !== "string" || moduleRecord.fluxoPrincipal.trim().length < 20) errors.push(`${label}: fluxoPrincipal insuficiente.`);
    if (!allowedStatuses.has(moduleRecord?.status)) errors.push(`${label}: status inválido (${moduleRecord?.status}).`);
    if (!Number.isInteger(moduleRecord?.iteracoes) || moduleRecord.iteracoes < 0) errors.push(`${label}: iteracoes deve ser inteiro >= 0.`);

    for (const field of ["problemasAbertos", "problemasResolvidos", "criteriosAtendidos", "capturasAprovadas", "vacinas"]) {
      if (!Array.isArray(moduleRecord?.[field])) errors.push(`${label}: ${field} deve ser array.`);
    }

    if (moduleRecord?.status === "em_correcao" && moduleRecord.iteracoes < 1) {
      errors.push(`${label}: módulo em correção precisa registrar ao menos uma iteração.`);
    }

    if (moduleRecord?.status === "aprovado") {
      if (moduleRecord.iteracoes < 1) errors.push(`${label}: aprovado sem iteração.`);
      if (moduleRecord.problemasAbertos.length) errors.push(`${label}: aprovado com problemas abertos.`);

      const missingCriteria = requiredCriteria.filter((criterion) => !moduleRecord.criteriosAtendidos.includes(criterion));
      if (missingCriteria.length) errors.push(`${label}: aprovado sem critérios ${missingCriteria.join(", ")}.`);

      for (const viewport of requiredViewports) {
        for (const theme of requiredThemes) {
          const capture = moduleRecord.capturasAprovadas.find((item) => item?.viewport === viewport && item?.tema === theme && typeof item?.url === "string" && item.url.startsWith("http"));
          if (!capture) errors.push(`${label}: aprovado sem captura ${viewport}/${theme}.`);
        }
      }

      if (!moduleRecord.logs || moduleRecord.logs.console_navegador !== "limpo" || moduleRecord.logs.servidor !== "limpo") {
        errors.push(`${label}: aprovado sem logs de navegador e servidor limpos.`);
      }
      if (!moduleRecord.logs?.consultado_em || Number.isNaN(Date.parse(moduleRecord.logs.consultado_em))) {
        errors.push(`${label}: aprovado sem data válida de revisão de logs.`);
      }
    }
  }
}

const protocol = fs.readFileSync(protocolPath, "utf8");
for (const token of [
  "CORRIGIR",
  "TESTAR LOCALMENTE",
  "PUBLICAR PREVIEW",
  "SIMULAR PERSONA REAL",
  "CAPTURAR",
  "ANALISAR COMO USUÁRIO",
  "REVISAR LOGS",
  "REGISTRAR VACINA",
  "1920×1080",
  "1366×768",
  "390×844"
]) {
  if (!protocol.includes(token)) errors.push(`Protocolo de módulos sem token obrigatório: ${token}`);
}

if (errors.length) {
  console.error(`Validação modular reprovada (${errors.length} falha(s)):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const counts = inventory.modules.reduce((accumulator, moduleRecord) => {
  accumulator[moduleRecord.status] = (accumulator[moduleRecord.status] ?? 0) + 1;
  return accumulator;
}, {});
console.log(JSON.stringify({
  ok: true,
  modules: inventory.modules.length,
  registryModules: registryKeys.length,
  counts
}, null, 2));
