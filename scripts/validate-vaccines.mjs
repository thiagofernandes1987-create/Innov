import fs from"node:fs";

const errors=[];
const read=file=>fs.readFileSync(file,"utf8");
const vaccinesDirectory="diretrizes/vacinas";
// Descoberta por padrão e ordem lexical: VACINA-014-LISTA-FIXA-DE-MIGRATIONS-EM-TESTE.md.
// A procedência fica junto do código, conforme VACINA-016-VALIDADOR-QUE-CITA-OUTRO-VALIDADOR.md.
const vaccines=fs.readdirSync(vaccinesDirectory)
 .filter(file=>/^VACINA-\d{3}-.*\.md$/.test(file))
 .sort()
 .map(file=>`${vaccinesDirectory}/${file}`);
const required=["diretrizes/VACINAS.md",...vaccines];

for(const file of required){
 if(!fs.existsSync(file)){errors.push(`Vacina ausente: ${file}`);continue;}
 const content=read(file);
 if(file!=="diretrizes/VACINAS.md"){
  const legacy=content.includes("Causa raiz")&&content.includes("Vacina")&&/Teste (?:preventivo|negativo)/.test(content);
  const current=["Qual foi o problema","Como ocorreu","Por que aconteceu","Como foi detectado","Qual foi a solução"]
   .every(section=>content.includes(section));
  if(!legacy&&!current)errors.push(`${file} não segue nem a estrutura legada nem as cinco perguntas do protocolo atual.`);
 }
}

if(fs.existsSync("diretrizes/VACINAS.md")){
 const index=read("diretrizes/VACINAS.md");
 for(const file of vaccines){
  const id=/VACINA-\d{3}/.exec(file)?.[0];
  if(id&&!index.includes(id))errors.push(`Catálogo sem ${id}.`);
 }
}

// VACINA-001 — relações Supabase variáveis.
const relationHelper="lib/supabase/relations.ts";
if(!fs.existsSync(relationHelper))errors.push(`Helper canônico ausente: ${relationHelper}`);
else{
 const helper=read(relationHelper);
 for(const token of["singleRelation","relationRecords","relationRecord","relationField","isUnknownRecord"])
  if(!helper.includes(token))errors.push(`Helper de relações sem ${token}.`);
}
for(const file of["app/app/ocorrencias/page.tsx","app/cliente/ocorrencias/page.tsx","app/cliente/ocorrencias/novo/page.tsx"]){
 if(!fs.existsSync(file)){errors.push(`Arquivo da vacina de relações ausente: ${file}`);continue;}
 const content=read(file);
 if(!content.includes("@/lib/supabase/relations"))errors.push(`${file} não usa helper canônico de relações.`);
 for(const pattern of[/as\s+Record<string,\s*unknown>\[\]/,/function\s+firstRelation\s*\(/,/function\s+relationValue\s*\(/])
  if(pattern.test(content))errors.push(`${file} reintroduz normalização local insegura: ${pattern}`);
}

// VACINA-002 — validadores semânticos.
if(fs.existsSync("scripts/validate-stage18.mjs")){
 const stage18=read("scripts/validate-stage18.mjs");
 if(stage18.includes('href:"/cliente/ocorrencias"'))errors.push("Validador da Etapa 18 voltou a depender da sintaxe href rígida.");
 for(const token of['clientLayout.includes(\'"Ocorrências"\')','clientLayout.includes(\'"/cliente/ocorrencias"\')'])
  if(!stage18.includes(token))errors.push(`Validador da Etapa 18 sem verificação semântica: ${token}`);
}
if(fs.existsSync("scripts/validate-stage17.mjs")){
 const stage17=read("scripts/validate-stage17.mjs");
 for(const suffix of["_01.sql","_02.sql","_03.sql","_04.sql"])
  if(!stage17.includes(`stage17_inventory_assets_stocktakes${suffix}`))errors.push(`Validador da Etapa 17 sem migration fracionada ${suffix}.`);
 if(stage17.includes('"supabase/migrations/20260720160400_stage17_inventory_assets_stocktakes.sql"'))errors.push("Validador da Etapa 17 voltou a exigir migration monolítica inexistente.");
}

// VACINA-003 — ledger de migrations.
const packageJson=JSON.parse(read("package.json"));
if(!packageJson.scripts?.["validate:migrations"])errors.push("package.json sem validate:migrations.");
if(!packageJson.scripts?.["validate:vaccines"])errors.push("package.json sem validate:vaccines.");
if(!fs.existsSync("scripts/validate-supabase-migrations.mjs"))errors.push("Validador do ledger Supabase ausente.");
const ciWorkflow=read(".github/workflows/ci.yml");
const migrationStep=ciWorkflow.indexOf("validate-supabase-migrations.mjs");
const stageStep=ciWorkflow.indexOf("validate-stage17.mjs");
if(migrationStep<0||stageStep<0||migrationStep>stageStep)errors.push("CI não valida ledger antes das etapas.");

// VACINA-004 — privilégio mínimo.
for(const file of[
 "supabase/migrations/20260720234549_stage17_inventory_rpc_privileges.sql",
 "supabase/migrations/20260721020003_stage18_workflow_privilege_hardening.sql"
]){
 if(!fs.existsSync(file)){errors.push(`Migration de privilégio ausente: ${file}`);continue;}
 if(!/revoke/i.test(read(file)))errors.push(`${file} sem revoke explícito.`);
}

// VACINA-005 — workflow protegido.
if(fs.existsSync("supabase/migrations/20260721020003_stage18_workflow_privilege_hardening.sql")){
 const hardening=read("supabase/migrations/20260721020003_stage18_workflow_privilege_hardening.sql");
 for(const token of["current_user in ('authenticated','anon')","revoke insert,update,delete on public.crm_leads","revoke insert,update,delete on public.opportunities","revoke insert,update,delete on public.sac_tickets"])
  if(!hardening.includes(token))errors.push(`Hardening de workflow sem ${token}.`);
 if(hardening.includes("app.stage18_rpc"))errors.push("Hardening voltou a usar flag transacional como bypass.");
}

// VACINA-006 — runtimes das GitHub Actions.
const workflows=fs.readdirSync(".github/workflows").filter(file=>/\.ya?ml$/i.test(file));
const obsoleteActions=[/actions\/checkout@v[1-4]\b/g,/actions\/setup-node@v[1-4]\b/g,/actions\/setup-python@v[1-5]\b/g,/actions\/upload-artifact@v[1-4]\b/g];
for(const name of workflows){
 const file=`.github/workflows/${name}`;const content=read(file);
 for(const pattern of obsoleteActions)for(const match of content.match(pattern)??[])errors.push(`${file} usa action obsoleta: ${match}`);
}
for(const token of["actions/checkout@v6","actions/setup-node@v6","actions/setup-python@v6","actions/upload-artifact@v7"])
 if(!ciWorkflow.includes(token))errors.push(`CI sem action canônica Node 24: ${token}`);

const stage11Workflow=read(".github/workflows/stage11-homologation.yml");
const concurrentWorkflow=read(".github/workflows/stage18-concurrent-e2e.yml");
for(const[workflowFile,content]of[["stage11-homologation.yml",stage11Workflow],["stage18-concurrent-e2e.yml",concurrentWorkflow]]){
 for(const token of["actions/checkout@v6","actions/setup-node@v6"])
  if(!content.includes(token))errors.push(`${workflowFile} sem action canônica: ${token}`);
}

// VACINA-007 — scanner de segredos com placeholders.
const documentationValidator=read("scripts/validate-documentation.mjs");
for(const token of["function isSafeSecretPlaceholder","function validateSecrets","requiredHistorical","VACINA-007-SCANNER-DE-SEGREDOS.md"])
 if(!documentationValidator.includes(token))errors.push(`Scanner documental sem prevenção: ${token}`);
if(documentationValidator.includes("const forbiddenSecretPatterns"))errors.push("Scanner documental voltou ao modelo textual que gera falsos positivos.");
for(const token of["value===\"...\"","/^<[^>]+>$/","secrets\\."])
 if(!documentationValidator.includes(token))errors.push(`Scanner documental não reconhece placeholder seguro: ${token}`);

// VACINA-008 — instalação coerente.
for(const[workflowFile,content]of[["stage11-homologation.yml",stage11Workflow],["stage18-concurrent-e2e.yml",concurrentWorkflow]]){
 if(content.includes("--frozen-lockfile"))errors.push(`${workflowFile} voltou a usar lockfile congelado durante a política transitória.`);
 if(!content.includes("pnpm install --no-frozen-lockfile --reporter=append-only"))errors.push(`${workflowFile} sem política de instalação homologada.`);
 if(!content.includes("pnpm@11.15.0"))errors.push(`${workflowFile} sem versão canônica do pnpm.`);
}

// VACINA-009 — pré-requisitos e artefato resiliente.
const initializeIndex=concurrentWorkflow.indexOf("Initialize E2E report");
const secretsIndex=concurrentWorkflow.indexOf("Validate required secrets");
const installIndex=concurrentWorkflow.indexOf("Install dependencies");
if(initializeIndex<0||secretsIndex<0||installIndex<0||!(initializeIndex<secretsIndex&&secretsIndex<installIndex))errors.push("E2E concorrente não valida pré-requisitos na ordem obrigatória.");
for(const token of["status:\"prerequisites_pending\"","blocked_missing_secrets","if: always()","stage18-concurrent-e2e-report.json"])
 if(!concurrentWorkflow.includes(token))errors.push(`E2E concorrente sem diagnóstico resiliente: ${token}`);
if(stage11Workflow.indexOf("Validate required secrets")>stage11Workflow.indexOf("Install dependencies"))errors.push("Etapa 11 valida secrets depois da instalação.");

// VACINA-010 — JSON por serializador.
if(!concurrentWorkflow.includes("JSON.stringify"))errors.push("Workflow E2E não usa serializador JSON.");
if(/printf\s+['"]\{[^\n]*stage18-concurrent-e2e-report\.json/s.test(concurrentWorkflow))errors.push("Workflow E2E voltou a montar JSON manualmente com printf.");
const e2eScript=read("scripts/run-stage18-concurrent-e2e.mjs");
if(!e2eScript.includes("JSON.stringify(report,null,2)"))errors.push("Script E2E não serializa relatório com JSON.stringify.");

// VACINA-011 — identificadores reservados do Node/Next.
for(const name of fs.readdirSync("scripts").filter(file=>file.endsWith(".mjs"))){
 const file=`scripts/${name}`;const content=read(file);
 for(const pattern of[/\b(?:const|let|var)\s+module\b/,/(?:^|[;{}\n])\s*module\s*=/m])
  if(pattern.test(content))errors.push(`${file} atribui ao identificador reservado module.`);
}
const stage19Validator=read("scripts/validate-stage19.mjs");
if(!stage19Validator.includes("moduleMigration"))errors.push("Validador da Etapa 19 sem nome semântico moduleMigration.");
if(/eslint-disable[^\n]*no-assign-module-variable/.test(stage19Validator))errors.push("Validador da Etapa 19 desabilita a regra de identificador reservado.");

// VACINA-012 — coerência do estado pós-merge e durante a etapa ativa.
const stateFile="diretrizes/ESTADO-ATUAL.json";
if(!fs.existsSync(stateFile))errors.push(`Manifesto de estado ausente: ${stateFile}`);
else{
 let state;
 try{state=JSON.parse(read(stateFile));}catch(error){errors.push(`Manifesto de estado inválido: ${error instanceof Error?error.message:String(error)}`);}
 if(state){
  if(state.repository!=="thiagofernandes1987-create/Innov")errors.push("Manifesto aponta para repositório incorreto.");
  if(state.baseBranch!=="main")errors.push("Manifesto não usa main como base estável.");
  if(state.platformVersion!==packageJson.version)errors.push(`Manifesto diverge do package.json (${packageJson.version}).`);
  if(state.lastCompletedStage!==19)errors.push("Manifesto não registra Etapa 19 como última concluída.");
  if(state.nextStage!==20)errors.push("Manifesto não registra Etapa 20 como próxima etapa.");
  const readinessStatus=state.productionReadiness?.status;
  if(readinessStatus==="in_progress"){
   if(state.activeFunctionalBranch!=="feature/etapa-20-prontidao-producao")errors.push("Manifesto não registra a branch da Etapa 20 em andamento.");
   if(!Number.isInteger(state.activeFunctionalPullRequest)||state.activeFunctionalPullRequest<1)errors.push("Manifesto não registra PR funcional válido para a Etapa 20.");
  }else{
   if(state.activeFunctionalBranch!==null)errors.push("Manifesto registra branch funcional sem etapa em andamento.");
   if(state.activeFunctionalPullRequest!==null)errors.push("Manifesto registra PR funcional sem etapa em andamento.");
  }
  if(state.stage18ConcurrentE2E?.status!=="passed")errors.push("Manifesto não registra E2E da Etapa 18 como passed.");
  if(state.stage18ConcurrentE2E?.cleanup!=="passed")errors.push("Manifesto não registra cleanup da Etapa 18 como passed.");
  if(state.ci?.conclusion!=="success")errors.push("Manifesto não registra CI estável como success.");
 }
}
const currentStateDocs=[
 "diretrizes/SPEC.md",
 "diretrizes/INVENTARIO.md",
 "diretrizes/ROADMAP.md",
 "docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md",
 "docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md"
];
const stalePatterns=[
 /PR\s*`?#18`?\s+em\s+rascunho/i,
 /PR\s*`?#19`?[^\n]{0,80}rascunho/i,
 /E2E[^\n]{0,80}permanece\s+bloqueado/i,
 /execução\s+funcional\s+bloqueada/i,
 /status\s+do\s+relatório:\s*blocked_missing_secrets/i,
 /aguardando\s+estabilização\s+do\s+PR\s*`?#18`?/i
];
for(const file of currentStateDocs){
 const content=read(file);
 for(const pattern of stalePatterns)if(pattern.test(content))errors.push(`${file} reintroduz estado pós-merge obsoleto: ${pattern}`);
}

// VACINA-013 — fixtures não contornam fronteiras sensíveis.
const stage20Concurrency="scripts/run-stage20-inventory-concurrency-e2e.mjs";
if(!fs.existsSync(stage20Concurrency))errors.push(`Fixture de concorrência ausente: ${stage20Concurrency}`);
else{
 const fixture=read(stage20Concurrency);
 if(fixture.includes("reference_unit_cost"))errors.push("Fixture da Etapa 20 voltou a escrever custo de referência diretamente.");
 for(const token of["unitCost:1","create_inventory_movement","post_inventory_movement","E2E20-CONCURRENCY"])
  if(!fixture.includes(token))errors.push(`Fixture da Etapa 20 sem fronteira autorizada: ${token}`);
 if(/service\.from\([^\n]+\)\.update\(\{[^}]*status:/s.test(fixture))errors.push("Fixture da Etapa 20 altera status protegido diretamente com Service Role.");
}
const sensitiveGuard="supabase/migrations/20260720160730_stage17_inventory_sensitive_write_guard.sql";
if(!fs.existsSync(sensitiveGuard))errors.push(`Guard sensível ausente: ${sensitiveGuard}`);
else{
 const guard=read(sensitiveGuard);
 for(const token of["enforce_inventory_sensitive_write","reference_unit_cost","Permissão sensível necessária para definir custo de referência","revoke all on function"])
  if(!guard.includes(token))errors.push(`Guard sensível incompleto: ${token}`);
}

// VACINA-060 — leitor que não entende o arquivo responde zero.
const leitorSinapi="lib/sinapi/relatorio-oficial.ts";
if(!fs.existsSync(leitorSinapi))errors.push(`Leitor do relatório oficial ausente: ${leitorSinapi}`);
else{
 const leitor=read(leitorSinapi);
 // As três recusas do formato: código vindo do MATCH, preço vazio devolvendo
 // null, e a contagem de colunas de custo conferida contra as 27 UFs.
 if(!/MATCH\\\(/.test(leitor))errors.push("Leitor SINAPI não lê mais o código da composição do argumento do MATCH.");
 if(!leitor.includes('if (cru === "" || cru === "-") return null;'))errors.push("Leitor SINAPI voltou a tratar preço vazio como número.");
 if(!leitor.includes("colunasDeCusto.length !== UFS.length"))errors.push("Leitor SINAPI deixou de conferir as 27 colunas de custo antes do mapeamento posicional de UF.");
}
const montadorSinapi="lib/sinapi/official-reference-parser.ts";
if(!fs.existsSync(montadorSinapi))errors.push(`Montador do pacote SINAPI ausente: ${montadorSinapi}`);
else{
 const montador=read(montadorSinapi);
 if(!montador.includes("custoPorComposicao.get(filho.codigo)"))errors.push("Montador SINAPI voltou a gravar zero no custo da sub-composição.");
}
if(fs.existsSync("lib/sinapi/automatic-update-v2.ts"))errors.push("`automatic-update-v2.ts` voltou: o leitor do SINAPI tem um caminho só.");
const conferenciaAoVivo="tests/sinapi-layout-publicado.test.ts";
if(!fs.existsSync(conferenciaAoVivo))errors.push(`Conferência do layout publicado ausente: ${conferenciaAoVivo}`);
if(fs.existsSync("package.json")){
 const pacote=JSON.parse(read("package.json"));
 if(!pacote.scripts?.["sinapi:layout"])errors.push("`pnpm sinapi:layout` ausente: o layout publicado deixou de ser conferível.");
 const prebuild=pacote.scripts?.prebuild??"";
 if(prebuild.includes("sinapi-xlsx-parser"))errors.push("O `prebuild` voltou a conferir o leitor antigo em vez do leitor em uso.");
 if(!prebuild.includes("sinapi-relatorio-oficial")||!prebuild.includes("sinapi-official-reference-parser"))
  errors.push("O `prebuild` não confere o leitor SINAPI em uso.");
}

if(errors.length){
 console.error(`Vacinas inválidas (${errors.length} falha(s)):`);
 for(const error of errors)console.error(`- ${error}`);
 process.exit(1);
}
console.log(`Vacinas validadas: ${vaccines.length} causas-raiz documentadas e prevenções executáveis ativas.`);
