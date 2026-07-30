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

  const modules = Array.isArray(inventory.modules) ? inventory.modules : [];
  const moduleKeys = modules.map((module) => module?.modulo);
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

  for (const module of modules) {
    const label = module?.modulo ?? "<sem-modulo>";
    if (typeof module?.nome !== "string" || !module.nome.trim()) errors.push(`${label}: nome ausente.`);
    if (typeof module?.rotaPrincipal !== "string" || !module.rotaPrincipal.startsWith("/app")) errors.push(`${label}: rotaPrincipal inválida.`);
    if (typeof module?.personaPrincipal !== "string" || !module.personaPrincipal.trim()) errors.push(`${label}: personaPrincipal ausente.`);
    if (typeof module?.fluxoPrincipal !== "string" || module.fluxoPrincipal.trim().length < 20) errors.push(`${label}: fluxoPrincipal insuficiente.`);
    if (!allowedStatuses.has(module?.status)) errors.push(`${label}: status inválido (${module?.status}).`);
    if (!Number.isInteger(module?.iteracoes) || module.iteracoes < 0) errors.push(`${label}: iteracoes deve ser inteiro >= 0.`);

    for (const field of ["problemasAbertos", "problemasResolvidos", "criteriosAtendidos", "capturasAprovadas", "vacinas"]) {
      if (!Array.isArray(module?.[field])) errors.push(`${label}: ${field} deve ser array.`);
    }

    if (module?.status === "em_correcao" && module.iteracoes < 1) {
      errors.push(`${label}: módulo em correção precisa registrar ao menos uma iteração.`);
    }

    if (module?.status === "aprovado") {
      if (module.iteracoes < 1) errors.push(`${label}: aprovado sem iteração.`);
      if (module.problemasAbertos.length) errors.push(`${label}: aprovado com problemas abertos.`);

      const missingCriteria = requiredCriteria.filter((criterion) => !module.criteriosAtendidos.includes(criterion));
      if (missingCriteria.length) errors.push(`${label}: aprovado sem critérios ${missingCriteria.join(", ")}.`);

      for (const viewport of requiredViewports) {
        for (const theme of requiredThemes) {
          const capture = module.capturasAprovadas.find((item) => item?.viewport === viewport && item?.tema === theme && typeof item?.url === "string" && item.url.startsWith("http"));
          if (!capture) errors.push(`${label}: aprovado sem captura ${viewport}/${theme}.`);
        }
      }

      if (!module.logs || module.logs.console_navegador !== "limpo" || module.logs.servidor !== "limpo") {
        errors.push(`${label}: aprovado sem logs de navegador e servidor limpos.`);
      }
      if (!module.logs?.consultado_em || Number.isNaN(Date.parse(module.logs.consultado_em))) {
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

const counts = inventory.modules.reduce((acc, module) => {
  acc[module.status] = (acc[module.status] ?? 0) + 1;
  return acc;
}, {});
console.log(JSON.stringify({
  ok: true,
  modules: inventory.modules.length,
  registryModules: registryKeys.length,
  counts
}, null, 2));
