import fs from "node:fs";

const required = {
  spec: "diretrizes/SPEC.md",
  inventory: "diretrizes/INVENTARIO.md",
  modules: "diretrizes/MODULOS.md",
  architecture: "diretrizes/ARQUITETURA.md",
  roadmap: "diretrizes/ROADMAP.md",
  recovery: "diretrizes/RECUPERACAO.md",
  vaccines: "diretrizes/VACINAS.md",
  state: "diretrizes/ESTADO-ATUAL.json",
  stageInventory: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/INVENTARIO.md",
  licenses: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/MATRIZ-LICENCAS-E-REAPROVEITAMENTO.md",
  notices: "THIRD_PARTY_NOTICES.md",
  closure: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/ENCERRAMENTO-W22.md",
  decision: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/DECISAO-PRODUCAO-W22.md",
  evidence19: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/EVIDENCIAS-W19.md",
  evidence20: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/EVIDENCIAS-W20.md",
  evidence21: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/EVIDENCIAS-W21.md",
  evidence22: "docs/ETAPA-22-WHATSAPP-WEB-NAO-OFICIAL/EVIDENCIAS-W22.md"
};

const failures = [];
for (const file of Object.values(required)) {
  if (!fs.existsSync(file)) failures.push(`Arquivo W-22 ausente: ${file}`);
}
const read = key => fs.existsSync(required[key]) ? fs.readFileSync(required[key], "utf8") : "";

for (const [key, tokens] of Object.entries({
  spec: ["Etapa 22", "provider-neutral", "Meta Cloud", "NOT_AUTHORIZED"],
  inventory: ["Etapa 22", "PR `#40`", "HOLD", "BLOCKED_NOT_EXECUTED"],
  modules: ["WHATSAPP_WEB_BAILEYS", "DRAFT_ONLY", "runtime produtivo", "PR `#40`"],
  architecture: ["gateway isolado", "persist-before-dispatch", "single writer", "fencing"],
  roadmap: ["Etapa 22", "W-19", "W-20", "W-21", "W-22", "NOT_AUTHORIZED"],
  recovery: ["messaging-gateway", "validate-messaging-w22-closure", "não recupera sessão real", "purge"],
  vaccines: ["Encerramento da Etapa 22", "evidência sintética", "BLOCKED_NOT_EXECUTED"],
  stageInventory: ["Sprint W-22", "Estado técnico", "BLOCKED_PENDING_REVIEW", "NOT_AUTHORIZED"],
  licenses: ["Baileys adicionado como dependência", "`YES`", "7.0.0-rc13", "revisão jurídica"],
  notices: ["@whiskeysockets/baileys@7.0.0-rc13", "runtime ativo do gateway continua sendo `FakeChannelClient`"],
  closure: ["BLOCKED_NOT_EXECUTED", "PENDING_EXTERNAL_REVIEW", "NOT_AUTHORIZED", "BLOCKED_PENDING_REVIEW"],
  decision: ["**Decisão:** `HOLD`", "**Produção:** `NOT_AUTHORIZED`", "**Piloto real:** `NOT_EXECUTED`"]
})) {
  const content = read(key);
  for (const token of tokens) if (!content.includes(token)) failures.push(`${required[key]} sem ${token}`);
}

for (const [key, token] of [
  ["evidence19", "concluída parcialmente; escopo sintético aprovado"],
  ["evidence20", "homologação real bloqueada e não executada"],
  ["evidence21", "piloto real em `HOLD` e não executado"]
]) if (!read(key).includes(token)) failures.push(`${required[key]} sem classificação honesta: ${token}`);

let state;
try { state = JSON.parse(read("state")); }
catch (error) { failures.push(`ESTADO-ATUAL.json inválido: ${error instanceof Error ? error.message : String(error)}`); }
if (state) {
  if (state.platformVersion !== "0.19.0") failures.push("W-22 não pode elevar a versão estável sem merge.");
  if (state.lastCompletedStage !== 19 || state.nextStage !== 20) failures.push("W-22 não pode alterar o marco estável exigido pelo manifesto.");
  const stage22 = state.stage22Execution;
  if (!stage22) failures.push("Manifesto sem stage22Execution.");
  else {
    if (stage22.branch !== "feature/etapa-22-provider-whatsapp-web-baileys") failures.push("Manifesto sem branch W-22 correta.");
    if (stage22.pullRequest !== 40) failures.push("Manifesto sem PR #40.");
    if (stage22.productionDecision !== "NOT_AUTHORIZED") failures.push("Produção precisa permanecer NOT_AUTHORIZED.");
    if (stage22.pilotDecision !== "HOLD") failures.push("Piloto precisa permanecer HOLD.");
    if (stage22.realHomologation !== "NOT_EXECUTED") failures.push("Homologação real não pode ser apresentada como executada.");
    if (stage22.pullRequestDisposition !== "DRAFT_PENDING_TECHNICAL_AND_SECURITY_REVIEW") failures.push("PR deve permanecer draft até revisão.");
  }
}

const combined = Object.keys(required).map(read).join("\n");
for (const forbidden of [
  "productionDecision\": \"GO\"",
  "piloto real concluído",
  "homologação real concluída",
  "PR #40 mesclado",
  "Baileys adicionado como dependência | `NO`"
]) if (combined.toLowerCase().includes(forbidden.toLowerCase())) failures.push(`Fechamento contém afirmação proibida: ${forbidden}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: "messaging-stage22-closure-boundary-v1",
  technicalScopeClosed: true,
  syntheticEvidenceClassified: true,
  realHomologationExecuted: false,
  realPilotExecuted: false,
  productionAuthorized: false,
  productionDecision: "NOT_AUTHORIZED",
  pilotDecision: "HOLD",
  pullRequestDraft: true,
  pullRequestMerged: false,
  pendingExternalReview: true
}, null, 2));
