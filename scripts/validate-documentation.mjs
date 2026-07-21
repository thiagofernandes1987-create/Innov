import fs from "node:fs";

const errors=[];
const requiredCanonical=[
 "diretrizes/README.md",
 "diretrizes/SPEC.md",
 "diretrizes/INVENTARIO.md",
 "diretrizes/MODULOS.md",
 "diretrizes/ARQUITETURA.md",
 "diretrizes/ROADMAP.md",
 "diretrizes/RECUPERACAO.md",
 "diretrizes/VACINAS.md",
 "diretrizes/PADRAO-DOCUMENTACAO.md",
 "diretrizes/HISTORICO-ETAPAS.md"
];
const requiredVaccines=[
 "diretrizes/vacinas/VACINA-001-RELACOES-SUPABASE.md",
 "diretrizes/vacinas/VACINA-002-VALIDADORES-SEMANTICOS.md",
 "diretrizes/vacinas/VACINA-003-LEDGER-MIGRATIONS-SUPABASE.md",
 "diretrizes/vacinas/VACINA-004-PRIVILEGIOS-RPCS.md",
 "diretrizes/vacinas/VACINA-005-WORKFLOW-PROTEGIDO.md",
 "diretrizes/vacinas/VACINA-006-RUNTIME-GITHUB-ACTIONS.md"
];
const requiredHistorical=[
 "docs/ETAPA-09-FINANCEIRO-CONTRATOS.md",
 "docs/ETAPA-09-TEST-PLAN.md",
 "docs/ETAPA-10-HOMOLOGACAO-SUPABASE.md",
 "docs/ETAPA-11-HOMOLOGACAO-AUTENTICADA.md",
 "docs/ETAPA-12-GESTAO-DE-OBRAS.md",
 "docs/RELATORIO-HOMOLOGACAO-ETAPA-12.md",
 "docs/ETAPA-12-1-NUCLEO-MODULAR-E-ACESSOS.md",
 "docs/ETAPA-12-2-ASSINATURA-AVANCADA.md",
 "docs/ETAPA-13-QUALIDADE-FORMULARIOS.md",
 "docs/ETAPA-14-COMPRAS-SUPRIMENTOS.md",
 "docs/ETAPA-15-FINANCEIRO-OPERACIONAL.md",
 "docs/ETAPA-16-RELATORIOS-INDICADORES-EXECUTIVOS.md",
 "docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md",
 "docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md",
 "docs/ETAPA-18-CRM-CLIENTES-SAC.md",
 "docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md",
 "docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md",
 "docs/ADENDO-ESCOPO-MULTIOBRA-ASSINATURAS-PERMISSOES.md",
 "docs/DECISAO-ARQUITETURAL-MODULOS-PLUG-AND-PLAY.md"
];

for(const file of [...requiredCanonical,...requiredVaccines,...requiredHistorical]){
 if(!fs.existsSync(file)){errors.push(`Arquivo documental ausente: ${file}`);continue;}
 if(fs.statSync(file).size<80)errors.push(`Arquivo documental vazio ou insuficiente: ${file}`);
}

if(!fs.existsSync("lib/modules/registry.ts"))errors.push("Registro modular ausente: lib/modules/registry.ts");
if(!fs.existsSync("package.json"))errors.push("package.json ausente");
if(!fs.existsSync("README.md"))errors.push("README.md ausente");

if(errors.length===0){
 const registry=fs.readFileSync("lib/modules/registry.ts","utf8");
 const moduleKeys=[...registry.matchAll(/\{\s*key:\s*"([^"]+)"/g)].map(match=>match[1]);
 const uniqueKeys=[...new Set(moduleKeys)];
 const modulesDoc=fs.readFileSync("diretrizes/MODULOS.md","utf8");
 const inventory=fs.readFileSync("diretrizes/INVENTARIO.md","utf8");
 const spec=fs.readFileSync("diretrizes/SPEC.md","utf8");
 const roadmap=fs.readFileSync("diretrizes/ROADMAP.md","utf8");
 const recovery=fs.readFileSync("diretrizes/RECUPERACAO.md","utf8");
 const vaccinesIndex=fs.readFileSync("diretrizes/VACINAS.md","utf8");
 const documentationPolicy=fs.readFileSync("diretrizes/PADRAO-DOCUMENTACAO.md","utf8");
 const history=fs.readFileSync("diretrizes/HISTORICO-ETAPAS.md","utf8");
 const readme=fs.readFileSync("README.md","utf8");
 const stage17=fs.readFileSync("docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md","utf8");
 const stage17Report=fs.readFileSync("docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md","utf8");
 const stage18=fs.readFileSync("docs/ETAPA-18-CRM-CLIENTES-SAC.md","utf8");
 const stage18E2E=fs.readFileSync("docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md","utf8");
 const stage21=fs.readFileSync("docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md","utf8");
 const packageJson=JSON.parse(fs.readFileSync("package.json","utf8"));

 if(uniqueKeys.length<20)errors.push(`Registro modular inesperadamente pequeno: ${uniqueKeys.length} módulos.`);
 for(const key of uniqueKeys){
  if(!modulesDoc.includes(`## \`${key}\``))errors.push(`Módulo sem contrato canônico em MODULOS.md: ${key}`);
  if(!inventory.includes(`| \`${key}\` |`))errors.push(`Módulo sem linha no inventário: ${key}`);
 }

 for(const token of[
  "Fonte de verdade","Princípios inegociáveis","Modelo de autorização","Aplicativos modulares",
  "Próxima etapa oficial","Estoque, Inventário e Almoxarifado","Etapa 21","WMS avançado"
 ])if(!spec.includes(token))errors.push(`SPEC sem seção obrigatória: ${token}`);

 for(const token of[
  "Etapa 17","Estoque, Inventário e Almoxarifado","Definition of Done adicional",
  "Etapa 21","WMS avançado","endereçamento automatizado","RFID em tempo real",
  "ressuprimento automático sem aprovação","roteirização logística","integração fiscal de entrada",
  "depreciação contábil oficial"
 ])if(!roadmap.includes(token))errors.push(`Roadmap incompleto: ${token}`);

 for(const token of[
  "documentação atualizada no mesmo PR","migration aplicada e homologada",
  "recebimento de Compras integrado de forma idempotente","saldo não editável diretamente",
  "movimentos concluídos imutáveis","testes de concorrência e saldo",
  "isolamento multiempresa e multiobra","CI verde"
 ]){
  if(!roadmap.includes(token))errors.push(`Roadmap sem Definition of Done da Etapa 17: ${token}`);
  if(!modulesDoc.includes(token))errors.push(`Contrato do estoque sem Definition of Done: ${token}`);
 }

 for(const token of["git clone","supabase/migrations","pnpm validate:docs","Service Role","Checklist final de recuperação"])
  if(!recovery.includes(token))errors.push(`Recuperação incompleta: ${token}`);

 for(const token of["Código sem documentação atualizada","Definition of Done documental","mesmo PR","Proibição de dependência em conversa ou contêiner","Vacinas de engenharia"])
  if(!documentationPolicy.includes(token))errors.push(`Política documental incompleta: ${token}`);

 for(const file of requiredHistorical){
  const relative=file.replace(/^docs\//,"../docs/");
  if(!history.includes(relative))errors.push(`Histórico sem link para ${file}`);
 }

 for(const token of["diretrizes/SPEC.md","diretrizes/INVENTARIO.md","diretrizes/RECUPERACAO.md","pnpm validate:docs"])
  if(!readme.includes(token))errors.push(`README sem referência obrigatória: ${token}`);

 for(const token of["VACINA-001","VACINA-002","VACINA-003","VACINA-004","VACINA-005","VACINA-006","Definition of Done de erro"])
  if(!vaccinesIndex.includes(token))errors.push(`Catálogo de vacinas incompleto: ${token}`);

 for(const token of["18 tabelas","advisory locks","14 testes transacionais","ledger remoto","ROLLBACK"])
  if(!stage17Report.includes(token))errors.push(`Relatório de homologação da Etapa 17 incompleto: ${token}`);

 for(const token of["advisory lock","14 testes","isolamento multiobra","migration aplicada"])
  if(!stage17.toLowerCase().includes(token.toLowerCase()))errors.push(`Documento da Etapa 17 incompleto: ${token}`);

 for(const token of["Cliente 360","múltiplas obras","SAC e pós-venda","RLS","Definition of Done"])
  if(!stage18.includes(token))errors.push(`Documento da Etapa 18 incompleto: ${token}`);

 for(const token of["login paralelo","mensagem interna","Promise.all","cleanup","Vacinas aplicadas","Critério de conclusão"])
  if(!stage18E2E.includes(token))errors.push(`Documento E2E concorrente incompleto: ${token}`);

 for(const token of[
  "WMS avançado","Endereçamento automatizado","RFID em tempo real",
  "Ressuprimento automático sem aprovação","Roteirização logística",
  "Integração fiscal de entrada","Depreciação contábil oficial",
  "Definition of Done adicional","CI verde"
 ])if(!stage21.includes(token))errors.push(`Plano da Etapa 21 incompleto: ${token}`);

 if(!spec.includes(`**Versão implementada da plataforma:** ${packageJson.version}`))
  errors.push(`Versão da SPEC diverge do package.json (${packageJson.version}).`);

 const forbiddenSecretPatterns=[
  /SUPABASE_SERVICE_ROLE_KEY[ \t]*=[ \t]*[^ \t\r\n]+/,
  /DEMO_ADMIN_PASSWORD[ \t]*=[ \t]*[^ \t\r\n]+/,
  /DEMO_CLIENT_PASSWORD[ \t]*=[ \t]*[^ \t\r\n]+/,
  /sk_[a-zA-Z0-9_-]{12,}/,
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/
 ];
 for(const file of [...requiredCanonical,...requiredVaccines,...requiredHistorical]){
  const content=fs.readFileSync(file,"utf8");
  for(const pattern of forbiddenSecretPatterns){
   if(pattern.test(content))errors.push(`Possível segredo encontrado em ${file}: ${pattern}`);
  }
 }
}

if(errors.length){
 console.error(`Documentação inválida (${errors.length} falha(s)):`);
 for(const error of errors)console.error(`- ${error}`);
 process.exit(1);
}

console.log(`Documentação validada: ${requiredCanonical.length} documentos canônicos, ${requiredVaccines.length} vacinas, ${requiredHistorical.length} históricos/planejados e todos os módulos do registry inventariados.`);
