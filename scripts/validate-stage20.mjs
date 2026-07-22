import fs from "node:fs";

const errors=[];
const read=file=>fs.readFileSync(file,"utf8");
const requiredFiles=[
 "diretrizes/UI-UX-PRO-MAX.md",
 "docs/ETAPA-20-PRONTIDAO-PRODUCAO.md",
 "diretrizes/ESTADO-ATUAL.json",
 "app/globals.css",
 "app/stage20.css",
 "app/layout.tsx",
 "app/app/layout.tsx",
 "app/app/page.tsx",
 "scripts/run-stage20-inventory-concurrency-e2e.mjs",
 ".github/workflows/stage20-inventory-concurrency-e2e.yml"
];

for(const file of requiredFiles){
 if(!fs.existsSync(file)){errors.push(`Arquivo obrigatório da Etapa 20 ausente: ${file}`);continue;}
 if(fs.statSync(file).size<100)errors.push(`Arquivo obrigatório insuficiente: ${file}`);
}

if(errors.length===0){
 const design=read("diretrizes/UI-UX-PRO-MAX.md");
 const stage20=read("docs/ETAPA-20-PRONTIDAO-PRODUCAO.md");
 const css=read("app/globals.css");
 const hardeningCss=read("app/stage20.css");
 const rootLayout=read("app/layout.tsx");
 const appLayout=read("app/app/layout.tsx");
 const dashboard=read("app/app/page.tsx");
 const concurrencyScript=read("scripts/run-stage20-inventory-concurrency-e2e.mjs");
 const concurrencyWorkflow=read(".github/workflows/stage20-inventory-concurrency-e2e.yml");
 const packageJson=JSON.parse(read("package.json"));
 let state;
 try{state=JSON.parse(read("diretrizes/ESTADO-ATUAL.json"));}
 catch(error){errors.push(`ESTADO-ATUAL.json inválido: ${error instanceof Error?error.message:String(error)}`);}

 for(const token of[
  "Arquitetura em operação","WCAG 2.2 nível AA","Estados obrigatórios","Padrões proibidos",
  "Pipeline obrigatório de UI/UX","Checklist de entrega","prefers-reduced-motion","44×44px"
 ])if(!design.includes(token))errors.push(`Diretriz UI/UX sem contrato obrigatório: ${token}`);

 for(const token of[
  "## Objetivo","## Escopo incluído","## Fora do escopo","## Fluxos","## Modelo de dados",
  "## Rotas","## RPCs e integrações","## Segurança e RLS","## Storage","## UI/UX Pro Max",
  "## Migrations","## Testes","## Homologação","## Vacinas aplicadas ou criadas",
  "## Limitações iniciais","## Próximos passos","## Definition of Done"
 ])if(!stage20.includes(token))errors.push(`Documento da Etapa 20 sem seção: ${token}`);

 for(const token of[
  "--ink:","--navy:","--brand:","--copper:","--limestone:","--paper:","--ring:",
  ".skip-link", ".page-heading", ".stats-grid", ".card-grid", ".section-heading",
  ".eyebrow", ".text-link", ".empty-state", ".module-card", ".organization-chip",
  "min-height: 44px", ":focus-visible", "@media (prefers-reduced-motion: reduce)",
  "@media (max-width: 960px)", "@media (max-width: 720px)"
 ])if(!css.includes(token))errors.push(`Design system sem implementação obrigatória: ${token}`);

 for(const token of["@supports not (backdrop-filter: blur(1px))",".brand > span:last-child","@media (forced-colors: active)"])
  if(!hardeningCss.includes(token))errors.push(`Hardening responsivo sem prevenção: ${token}`);

 for(const token of[
  'className="skip-link"','href="#conteudo-principal"','aria-label="Navegação principal"',
  'className="nav-icon"','id="conteudo-principal"','tabIndex={-1}','className="organization-chip mono"'
 ])if(!appLayout.includes(token))errors.push(`Shell interno sem requisito de acessibilidade/UX: ${token}`);

 for(const token of[
  'className="content dashboard-page"','className="page-heading"','className="stats-grid"',
  'className="category-section"','className="card-grid"','className="card module-card"',
  'className="empty-state card"','aria-label={`Abrir ${application.name}. ${accessLabel[application.accessLevel]}.`}'
 ])if(!dashboard.includes(token))errors.push(`Dashboard sem composição canônica: ${token}`);

 for(const token of[
  'const operatorA=createClient','const operatorB=createClient','const initialQuantity=10','const competingQuantity=6',
  'Promise.all([','post_inventory_movement','advisory_lock_serialized_posts','successful.length===1',
  'stockAfterRace.physical>=0','cleanup.finalStock','finalStock.physical===0','JSON.stringify(report,null,2)'
 ])if(!concurrencyScript.includes(token))errors.push(`E2E de concorrência sem contrato obrigatório: ${token}`);

 const initializeIndex=concurrencyWorkflow.indexOf("Initialize inventory concurrency report");
 const secretsIndex=concurrencyWorkflow.indexOf("Validate required secrets");
 const installIndex=concurrencyWorkflow.indexOf("Install dependencies");
 const runIndex=concurrencyWorkflow.indexOf("Run real inventory concurrency E2E");
 if(initializeIndex<0||secretsIndex<0||installIndex<0||runIndex<0||!(initializeIndex<secretsIndex&&secretsIndex<installIndex&&installIndex<runIndex))
  errors.push("Workflow de concorrência não segue a ordem segura de pré-requisitos.");
 for(const token of[
  "environment: homologation","cancel-in-progress: false","status:\"prerequisites_pending\"",
  "blocked_missing_secrets","pnpm@11.15.0","pnpm install --no-frozen-lockfile --reporter=append-only",
  "pnpm test:e2e:stage20:inventory-concurrency","if: always()","actions/upload-artifact@v7",
  "stage20-inventory-concurrency-report.json"
 ])if(!concurrencyWorkflow.includes(token))errors.push(`Workflow de concorrência sem prevenção obrigatória: ${token}`);

 if(!rootLayout.includes('import "./stage20.css";'))errors.push("Layout raiz não carrega o hardening da Etapa 20.");
 if(!rootLayout.includes('<html lang="pt-BR">'))errors.push("Layout raiz sem locale pt-BR.");
 if(!packageJson.scripts?.["validate:stage20"])errors.push("package.json sem validate:stage20.");
 if(packageJson.scripts?.["test:e2e:stage20:inventory-concurrency"]!=="node scripts/run-stage20-inventory-concurrency-e2e.mjs")
  errors.push("package.json sem executor canônico do E2E de concorrência.");
 if(state){
  if(state.nextStage!==20)errors.push("Manifesto não aponta a Etapa 20.");
  if(state.activeFunctionalBranch!=="feature/etapa-20-prontidao-producao")errors.push("Manifesto não registra a branch funcional da Etapa 20.");
  if(state.productionReadiness?.status!=="in_progress")errors.push("Manifesto não registra prontidão de produção em andamento.");
  if(state.productionReleased!==false)errors.push("Manifesto declara produção liberada antes da conclusão.");
 }

 const uiImplementation=`${css}\n${hardeningCss}\n${appLayout}\n${dashboard}`;
 for(const forbidden of[/#ec4899/i,/#db2777/i,/\bfuchsia\b/i,/\bpink\b/i])
  if(forbidden.test(uiImplementation))errors.push(`Implementação reintroduz preset visual proibido: ${forbidden}`);
 for(const fileContent of[["app/app/layout.tsx",appLayout],["app/app/page.tsx",dashboard]])
  if(/style=\{\{/.test(fileContent[1]))errors.push(`${fileContent[0]} mantém estilo inline em componente-base.`);
 if(/outline\s*:\s*none/i.test(css))errors.push("Design system remove outline sem substituição canônica.");
 if(!/button:focus-visible[^\{]*,\s*a:focus-visible/s.test(css))errors.push("Design system não cobre foco visível de botões e links.");
 if(/SUPABASE_SERVICE_ROLE_KEY[^\n]*(console\.log|JSON\.stringify)/.test(concurrencyScript))errors.push("E2E pode registrar Service Role no relatório.");
}

if(errors.length){
 console.error(`Etapa 20 inválida (${errors.length} falha(s)):`);
 for(const error of errors)console.error(`- ${error}`);
 process.exit(1);
}

console.log("Etapa 20 validada: UI/UX Pro Max, shell acessível e E2E concorrente real do estoque ativos.");
