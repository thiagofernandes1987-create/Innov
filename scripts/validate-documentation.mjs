import fs from "node:fs";

const errors=[];
const requiredCanonical=[
 "diretrizes/README.md","diretrizes/SPEC.md","diretrizes/ESTADO-ATUAL.json","diretrizes/INVENTARIO.md",
 "diretrizes/MODULOS.md","diretrizes/ARQUITETURA.md","diretrizes/ROADMAP.md","diretrizes/RECUPERACAO.md",
 "diretrizes/VACINAS.md","diretrizes/UI-UX-PRO-MAX.md","diretrizes/PADRAO-DOCUMENTACAO.md","diretrizes/HISTORICO-ETAPAS.md"
];
const requiredVaccines=[
 "diretrizes/vacinas/VACINA-001-RELACOES-SUPABASE.md",
 "diretrizes/vacinas/VACINA-002-VALIDADORES-SEMANTICOS.md",
 "diretrizes/vacinas/VACINA-003-LEDGER-MIGRATIONS-SUPABASE.md",
 "diretrizes/vacinas/VACINA-004-PRIVILEGIOS-RPCS.md",
 "diretrizes/vacinas/VACINA-005-WORKFLOW-PROTEGIDO.md",
 "diretrizes/vacinas/VACINA-006-RUNTIME-GITHUB-ACTIONS.md",
 "diretrizes/vacinas/VACINA-007-SCANNER-DE-SEGREDOS.md",
 "diretrizes/vacinas/VACINA-008-INSTALACAO-HOMOLOGACAO.md",
 "diretrizes/vacinas/VACINA-009-PREREQUISITOS-E-RELATORIO-E2E.md",
 "diretrizes/vacinas/VACINA-010-JSON-DE-RELATORIOS.md",
 "diretrizes/vacinas/VACINA-011-IDENTIFICADORES-RESERVADOS-NODE-NEXT.md",
 "diretrizes/vacinas/VACINA-012-ESTADO-POS-MERGE.md",
 "diretrizes/vacinas/VACINA-013-FIXTURES-RESPEITAM-FRONTEIRAS-SENSIVEIS.md"
];
const requiredHistorical=[
 "docs/ETAPA-09-FINANCEIRO-CONTRATOS.md","docs/ETAPA-09-TEST-PLAN.md","docs/ETAPA-10-HOMOLOGACAO-SUPABASE.md",
 "docs/ETAPA-11-HOMOLOGACAO-AUTENTICADA.md","docs/ETAPA-12-GESTAO-DE-OBRAS.md","docs/RELATORIO-HOMOLOGACAO-ETAPA-12.md",
 "docs/ETAPA-12-1-NUCLEO-MODULAR-E-ACESSOS.md","docs/ETAPA-12-2-ASSINATURA-AVANCADA.md",
 "docs/ETAPA-13-QUALIDADE-FORMULARIOS.md","docs/ETAPA-14-COMPRAS-SUPRIMENTOS.md",
 "docs/ETAPA-15-FINANCEIRO-OPERACIONAL.md","docs/ETAPA-16-RELATORIOS-INDICADORES-EXECUTIVOS.md",
 "docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md","docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md",
 "docs/ETAPA-18-CRM-CLIENTES-SAC.md","docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md",
 "docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md","docs/ETAPA-20-PRONTIDAO-PRODUCAO.md",
 "docs/ETAPA-20-E2E-CONCORRENCIA-ESTOQUE.md","docs/ETAPA-20-BACKUP-RESTAURACAO.md",
 "docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md","docs/ADENDO-ESCOPO-MULTIOBRA-ASSINATURAS-PERMISSOES.md",
 "docs/DECISAO-ARQUITETURAL-MODULOS-PLUG-AND-PLAY.md"
];

function isSafeSecretPlaceholder(rawValue){
 const withoutContinuation=String(rawValue??"").replace(/[ \t]*\\[ \t]*$/,"" ).trim();
 const value=withoutContinuation.replace(/^("|'|`)|("|'|`)$/g,"").trim();
 if(!value)return true;
 return value==="..."||/^\*+$/.test(value)||/^<[^>]+>$/.test(value)||/^\[?REDACTED\]?$/i.test(value)
  ||/^CHANGE(?:ME)?$/i.test(value)||/^YOUR[_-]/i.test(value)||/^(?:example|placeholder)/i.test(value)
  ||/^\$\{[A-Z0-9_]+\}$/.test(value)||/^\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}$/.test(value);
}

function validateSecrets(file,content){
 const sensitiveNames=[
  "SUPABASE_SERVICE_ROLE_KEY","DEMO_ADMIN_PASSWORD","DEMO_CLIENT_PASSWORD","SIGNATURE_WEBHOOK_SECRET",
  "SUPABASE_DB_URL","SUPABASE_RESTORE_DB_URL","SUPABASE_RESTORE_CONFIRMATION"
 ];
 const assignmentPattern=new RegExp(`^(?:export[ \\t]+)?(${sensitiveNames.join("|")})[ \\t]*=[ \\t]*(.*)$`,"gm");
 for(const match of content.matchAll(assignmentPattern))if(!isSafeSecretPlaceholder(match[2]))
  errors.push(`Possível segredo encontrado em ${file}: variável ${match[1]}.`);
 const tokenPatterns=[
  {name:"chave com prefixo sk_",pattern:/\bsk_[a-zA-Z0-9_-]{12,}\b/},
  {name:"token JWT aparente",pattern:/\beyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}(?:\.[a-zA-Z0-9_-]{10,})?\b/},
  {name:"URL PostgreSQL concreta",pattern:/postgres(?:ql)?:\/\/[^\s<>{}\[\]]+:[^\s<>{}\[\]]+@/i}
 ];
 for(const{pattern,name}of tokenPatterns)if(pattern.test(content))errors.push(`Possível segredo encontrado em ${file}: ${name}.`);
}

for(const file of [...requiredCanonical,...requiredVaccines,...requiredHistorical]){
 if(!fs.existsSync(file)){errors.push(`Arquivo documental ausente: ${file}`);continue;}
 if(fs.statSync(file).size<80)errors.push(`Arquivo documental vazio ou insuficiente: ${file}`);
}
for(const file of["lib/modules/registry.ts","package.json","README.md",".env.example"])
 if(!fs.existsSync(file))errors.push(`Arquivo obrigatório ausente: ${file}`);

if(errors.length===0){
 const read=file=>fs.readFileSync(file,"utf8");
 const registry=read("lib/modules/registry.ts");
 const moduleKeys=[...registry.matchAll(/\{\s*key:\s*"([^"]+)"/g)].map(match=>match[1]);
 const uniqueKeys=[...new Set(moduleKeys)];
 const modulesDoc=read("diretrizes/MODULOS.md");
 const inventory=read("diretrizes/INVENTARIO.md");
 const spec=read("diretrizes/SPEC.md");
 const roadmap=read("diretrizes/ROADMAP.md");
 const recovery=read("diretrizes/RECUPERACAO.md");
 const vaccinesIndex=read("diretrizes/VACINAS.md");
 const uiUx=read("diretrizes/UI-UX-PRO-MAX.md");
 const documentationPolicy=read("diretrizes/PADRAO-DOCUMENTACAO.md");
 const history=read("diretrizes/HISTORICO-ETAPAS.md");
 const readme=read("README.md");
 const envExample=read(".env.example");
 const stage17=read("docs/ETAPA-17-ESTOQUE-INVENTARIO-ALMOXARIFADO.md");
 const stage17Report=read("docs/RELATORIO-HOMOLOGACAO-ETAPA-17.md");
 const stage18=read("docs/ETAPA-18-CRM-CLIENTES-SAC.md");
 const stage18E2E=read("docs/ETAPA-18-E2E-CONCORRENTE-SUPABASE.md");
 const stage19=read("docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md");
 const stage20=read("docs/ETAPA-20-PRONTIDAO-PRODUCAO.md");
 const stage20Concurrency=read("docs/ETAPA-20-E2E-CONCORRENCIA-ESTOQUE.md");
 const stage20Restore=read("docs/ETAPA-20-BACKUP-RESTAURACAO.md");
 const stage21=read("docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md");
 const packageJson=JSON.parse(read("package.json"));
 let currentState;
 try{currentState=JSON.parse(read("diretrizes/ESTADO-ATUAL.json"));}
 catch(error){errors.push(`ESTADO-ATUAL.json inválido: ${error instanceof Error?error.message:String(error)}`);}

 if(uniqueKeys.length<20)errors.push(`Registro modular inesperadamente pequeno: ${uniqueKeys.length} módulos.`);
 for(const key of uniqueKeys){
  if(!modulesDoc.includes(`## \`${key}\``))errors.push(`Módulo sem contrato canônico em MODULOS.md: ${key}`);
  if(!inventory.includes(`| \`${key}\` |`))errors.push(`Módulo sem linha no inventário: ${key}`);
 }
 for(const token of["Fonte de verdade","Princípios inegociáveis","Modelo de autorização","Aplicativos modulares","Próxima etapa oficial","Etapa 21","WMS avançado"])
  if(!spec.includes(token))errors.push(`SPEC sem seção obrigatória: ${token}`);
 for(const token of["Etapa 17","testes de concorrência e saldo","Etapa 19","Etapa 20","Prontidão de produção","Backup e restauração","Etapa 21","WMS avançado"])
  if(!roadmap.includes(token))errors.push(`Roadmap incompleto: ${token}`);
 for(const token of["documentação atualizada no mesmo PR","migration aplicada e homologada","saldo não editável diretamente","movimentos concluídos imutáveis","testes de concorrência e saldo","isolamento multiempresa e multiobra","CI verde"]){
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
 for(let id=1;id<=13;id++)if(!vaccinesIndex.includes(`VACINA-${String(id).padStart(3,"0")}`))
  errors.push(`Catálogo de vacinas incompleto: VACINA-${String(id).padStart(3,"0")}`);
 if(!vaccinesIndex.includes("Definition of Done de erro"))errors.push("Catálogo de vacinas sem Definition of Done de erro.");
 for(const token of["Arquitetura em operação","WCAG 2.2 nível AA","Estados obrigatórios","Padrões proibidos","Pipeline obrigatório de UI/UX","Checklist de entrega"])
  if(!uiUx.includes(token))errors.push(`UI/UX Pro Max incompleta: ${token}`);
 for(const token of["18 tabelas","advisory locks","14 testes transacionais","ledger remoto","ROLLBACK"])
  if(!stage17Report.includes(token))errors.push(`Relatório da Etapa 17 incompleto: ${token}`);
 for(const token of["advisory lock","14 testes","isolamento multiobra","migration aplicada"])
  if(!stage17.toLowerCase().includes(token.toLowerCase()))errors.push(`Documento da Etapa 17 incompleto: ${token}`);
 for(const token of["Cliente 360","múltiplas obras","SAC e pós-venda","RLS","Definition of Done"])
  if(!stage18.includes(token))errors.push(`Documento da Etapa 18 incompleto: ${token}`);
 for(const token of["login paralelo","mensagem interna","Promise.all","cleanup","Vacinas aplicadas","Critério de conclusão"])
  if(!stage18E2E.includes(token))errors.push(`Documento E2E da Etapa 18 incompleto: ${token}`);
 for(const token of["fluxo unificado","correlation_id","append-only","RLS","alertas","health checks","diagnósticos","Definition of Done"])
  if(!stage19.toLowerCase().includes(token.toLowerCase()))errors.push(`Documento da Etapa 19 incompleto: ${token}`);
 for(const token of["Prontidão de Produção","UI/UX Pro Max","backup e restauração","antimalware","pentest","Definition of Done"])
  if(!stage20.toLowerCase().includes(token.toLowerCase()))errors.push(`Documento da Etapa 20 incompleto: ${token}`);
 for(const token of["status: passed","cleanup: passed","saldo inicial","uma postagem","saldo final zero","VACINA-013"])
  if(!stage20Concurrency.includes(token))errors.push(`Evidência de concorrência incompleta: ${token}`);
 for(const token of["SUPABASE_DB_URL","SUPABASE_RESTORE_DB_URL","STAGE20_DISPOSABLE_RESTORE","dump não é enviado","restauração em ambiente isolado","Critério de conclusão"])
  if(!stage20Restore.includes(token))errors.push(`Documento de backup/restauração incompleto: ${token}`);
 for(const token of["WMS avançado","Endereçamento automatizado","RFID em tempo real","Ressuprimento automático sem aprovação","Roteirização logística","Integração fiscal de entrada","Depreciação contábil oficial","CI verde"])
  if(!stage21.includes(token))errors.push(`Plano da Etapa 21 incompleto: ${token}`);
 for(const name of["SUPABASE_DB_URL","SUPABASE_RESTORE_DB_URL","SUPABASE_RESTORE_CONFIRMATION"])
  if(!envExample.includes(`${name}=`))errors.push(`.env.example sem variável da Etapa 20: ${name}`);

 if(!spec.includes(`**Versão implementada da plataforma:** ${packageJson.version}`))errors.push(`Versão da SPEC diverge do package.json (${packageJson.version}).`);
 if(currentState){
  if(currentState.platformVersion!==packageJson.version)errors.push(`Versão do manifesto diverge do package.json (${packageJson.version}).`);
  if(currentState.lastCompletedStage!==19)errors.push("Manifesto não registra a Etapa 19 como concluída.");
  if(currentState.nextStage!==20)errors.push("Manifesto não registra a Etapa 20 como próxima etapa.");
 }
 for(const file of [...requiredCanonical,...requiredVaccines,...requiredHistorical,".env.example"])
  validateSecrets(file,read(file));
}

if(errors.length){
 console.error(`Documentação inválida (${errors.length} falha(s)):`);
 for(const error of errors)console.error(`- ${error}`);
 process.exit(1);
}
console.log(`Documentação validada: ${requiredCanonical.length} canônicos, ${requiredVaccines.length} vacinas, ${requiredHistorical.length} históricos/planejados e todos os módulos inventariados.`);
