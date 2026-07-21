import fs from"node:fs";

const errors=[];
const read=file=>fs.readFileSync(file,"utf8");
const vaccines=[
 "diretrizes/vacinas/VACINA-001-RELACOES-SUPABASE.md",
 "diretrizes/vacinas/VACINA-002-VALIDADORES-SEMANTICOS.md",
 "diretrizes/vacinas/VACINA-003-LEDGER-MIGRATIONS-SUPABASE.md",
 "diretrizes/vacinas/VACINA-004-PRIVILEGIOS-RPCS.md",
 "diretrizes/vacinas/VACINA-005-WORKFLOW-PROTEGIDO.md",
 "diretrizes/vacinas/VACINA-006-RUNTIME-GITHUB-ACTIONS.md",
 "diretrizes/vacinas/VACINA-007-SCANNER-DE-SEGREDOS.md"
];
const required=["diretrizes/VACINAS.md",...vaccines];

for(const file of required){
 if(!fs.existsSync(file)){errors.push(`Vacina ausente: ${file}`);continue;}
 const content=read(file);
 for(const section of["Causa raiz","Vacina","Teste preventivo","Critério de encerramento"]){
  if(file!=="diretrizes/VACINAS.md"&&!content.includes(section))errors.push(`${file} sem seção ${section}.`);
 }
}

if(fs.existsSync("diretrizes/VACINAS.md")){
 const index=read("diretrizes/VACINAS.md");
 for(let id=1;id<=7;id++)if(!index.includes(`VACINA-00${id}`))errors.push(`Catálogo sem VACINA-00${id}.`);
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
 if(stage17.includes('"supabase/migrations/20260720160400_stage17_inventory_assets_stocktakes.sql"'))
  errors.push("Validador da Etapa 17 voltou a exigir migration monolítica inexistente.");
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
 const content=read(file);
 if(!/revoke/i.test(content))errors.push(`${file} sem revoke explícito.`);
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
const obsoleteActions=[
 /actions\/checkout@v[1-4]\b/g,
 /actions\/setup-node@v[1-4]\b/g,
 /actions\/setup-python@v[1-5]\b/g,
 /actions\/upload-artifact@v[1-4]\b/g
];
for(const name of workflows){
 const file=`.github/workflows/${name}`;
 const content=read(file);
 for(const pattern of obsoleteActions){
  const matches=content.match(pattern)??[];
  for(const match of matches)errors.push(`${file} usa action obsoleta: ${match}`);
 }
}
for(const token of["actions/checkout@v6","actions/setup-node@v6","actions/setup-python@v6","actions/upload-artifact@v7"])
 if(!ciWorkflow.includes(token))errors.push(`CI sem action canônica Node 24: ${token}`);
for(const workflowFile of[".github/workflows/stage11-homologation.yml",".github/workflows/stage18-concurrent-e2e.yml"]){
 const content=read(workflowFile);
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

if(errors.length){
 console.error(`Vacinas inválidas (${errors.length} falha(s)):`);
 for(const error of errors)console.error(`- ${error}`);
 process.exit(1);
}
console.log(`Vacinas validadas: ${vaccines.length} causas-raiz documentadas e prevenções executáveis ativas.`);
