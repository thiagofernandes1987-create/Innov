import fs from"node:fs";

const migrations=[
 "supabase/migrations/20260721012434_stage18_relationship_schema.sql",
 "supabase/migrations/20260721012505_stage18_relationship_idempotency.sql",
 "supabase/migrations/20260721012701_stage18_relationship_security.sql",
 "supabase/migrations/20260721013434_stage18_relationship_invariants.sql",
 "supabase/migrations/20260721013534_stage18_crm_functions.sql",
 "supabase/migrations/20260721013547_stage18_sac_client_actors.sql",
 "supabase/migrations/20260721013654_stage18_sac_functions.sql",
 "supabase/migrations/20260721013941_stage18_relationship_queries.sql",
 "supabase/migrations/20260721014030_stage18_relationship_module.sql",
 "supabase/migrations/20260721014621_stage18_relationship_performance.sql",
 "supabase/migrations/20260721015350_stage18_sac_portal_release_guard.sql",
 "supabase/migrations/20260721020003_stage18_workflow_privilege_hardening.sql"
];
const testFile="supabase/tests/stage18_relationship_homologation.sql";
const appFiles=[
 "lib/relationship/domain.ts","lib/relationship/server.ts","app/actions/relationship.ts",
 "components/relationship/relationship-navigation.tsx","components/relationship/relationship-metric.tsx",
 "app/app/crm/page.tsx","app/app/crm/leads/page.tsx","app/app/crm/leads/novo/page.tsx","app/app/crm/leads/[id]/page.tsx",
 "app/app/crm/oportunidades/page.tsx","app/app/crm/oportunidades/novo/page.tsx","app/app/crm/oportunidades/[id]/page.tsx",
 "app/app/clientes/page.tsx","app/app/clientes/novo/page.tsx","app/app/clientes/[id]/page.tsx",
 "app/app/ocorrencias/page.tsx","app/app/ocorrencias/novo/page.tsx","app/app/ocorrencias/[id]/page.tsx",
 "app/cliente/ocorrencias/page.tsx","app/cliente/ocorrencias/novo/page.tsx","app/cliente/ocorrencias/[id]/page.tsx",
 "app/api/sac/attachments/[id]/route.ts","app/relationship.css","docs/ETAPA-18-CRM-CLIENTES-SAC.md"
];
const errors=[];const read=file=>fs.readFileSync(file,"utf8");
for(const file of[...migrations,testFile,...appFiles])if(!fs.existsSync(file))errors.push(`Arquivo ausente: ${file}`);
function requireTokens(file,tokens,label){const content=read(file);for(const token of tokens)if(!content.includes(token))errors.push(`${label} sem ${token}: ${file}`);return content;}
function requireRegex(content,patterns,label){for(const pattern of patterns)if(!pattern.test(content))errors.push(`${label} não atende ${pattern}`);}

if(!errors.length){
 const schema=read(migrations[0]);
 const tables=[...schema.matchAll(/create table if not exists public\.([a-z_]+)/gi)].map(match=>match[1]);
 for(const table of["crm_leads","client_contacts","client_consents","crm_activities","crm_opportunity_stage_history","sac_categories","sac_tickets","sac_ticket_messages","sac_ticket_attachments","sac_ticket_events"])
  if(!tables.includes(table))errors.push(`Tabela da Etapa 18 ausente: ${table}`);
 requireRegex(schema,[/alter table public\.clients/i,/alter table public\.opportunities/i,/crm-sac-attachments/i,/sha256/i,/satisfaction_score/i],"Schema");

 requireRegex(read(migrations[1]),[/crm_leads_org_idempotency_uidx/i,/sac_tickets_org_idempotency_uidx/i,/sac_ticket_messages_ticket_idempotency_uidx/i],"Idempotência");
 const security=read(migrations[2]);
 const rls=[...security.matchAll(/alter table public\.([a-z_]+) enable row level security/gi)].map(match=>match[1]);
 if(new Set(rls).size!==10)errors.push(`RLS da Etapa 18 esperada em 10 tabelas; encontrada em ${new Set(rls).size}.`);
 requireRegex(security,[/is_client_owner/i,/can_access_sac_ticket/i,/opportunities_stage18_select/i,/crm_sac_storage_select_internal/i,/from public,anon/i],"Segurança");

 requireRegex(read(migrations[3]),[/stage18_validate_links/i,/stage18_protect_append_only/i,/opportunities_workflow_guard/i,/sac_tickets_workflow_guard/i],"Invariantes");
 requireRegex(read(migrations[4]),[/create_crm_lead/i,/create_crm_opportunity/i,/convert_crm_lead/i,/move_crm_opportunity_stage/i,/record_crm_activity/i],"CRM");
 requireRegex(read(migrations[5]),[/opened_by_client_id/i,/uploaded_client_id/i,/creator_check/i,/uploader_check/i],"Atores do portal");
 requireRegex(read(migrations[6]),[/create_sac_ticket/i,/add_sac_ticket_message/i,/register_sac_ticket_attachment/i,/assign_sac_ticket/i,/transition_sac_ticket/i,/rate_sac_ticket/i],"SAC");
 requireRegex(read(migrations[7]),[/get_crm_pipeline/i,/get_client_360/i,/get_client_portal_relationship/i,/get_sac_dashboard/i,/get_sac_ticket_detail/i],"Consultas seguras");
 requireRegex(read(migrations[8]),[/'crm'/i,/'clientes'/i,/'sac'/i,/install_stage18_relationship_defaults/i,/GARANTIA/i,/POS_VENDA/i],"Instalador modular");
 requireRegex(read(migrations[9]),[/client_consents_client_idx/i,/crm_leads_converted_client_idx/i,/sac_ticket_events_organization_idx/i,/sac_tickets_contract_idx/i],"Performance");
 requireRegex(read(migrations[10]),[/client_released_at is not null/i,/Obra não está liberada/i,/Contrato não está liberado/i],"Guard do portal");
 requireRegex(read(migrations[11]),[/current_user in \('authenticated','anon'\)/i,/move_crm_lead_stage/i,/revoke insert,update,delete on public\.sac_tickets/i,/crm_leads_workflow_guard/i],"Hardening de workflow");

 const test=read(testFile);
 for(const name of["module_installation","default_sac_categories","lead_idempotency","lead_duplicate_block","lead_workflow","lead_conversion_idempotency","opportunity_workflow","direct_opportunity_stage_block","ticket_idempotency","direct_ticket_status_block","ticket_workflow","ticket_history_immutable","internal_ticket_detail","client_portal_filter","hidden_project_block","client_message_visibility","multi_company_isolation","client_pipeline_hidden"])
  if(!test.includes(`'${name}'`))errors.push(`Teste da Etapa 18 ausente: ${name}`);
 if(!/^begin;/mi.test(test)||!/rollback;\s*$/i.test(test))errors.push("Homologação da Etapa 18 precisa terminar com ROLLBACK.");
 if(!test.includes("request.jwt.claims")||!test.includes("set local role authenticated"))errors.push("Homologação da Etapa 18 não simula identidade/RLS autenticada.");

 const actions=read("app/actions/relationship.ts");
 requireRegex(actions,[/createHash\("sha256"\)/i,/crm-sac-attachments/i,/createSupabaseAdminClient/i,/register_sac_ticket_attachment/i,/remove\(\[storagePath\]\)/i],"Uploads transacionais");
 if(actions.includes("SUPABASE_SERVICE_ROLE_KEY"))errors.push("Server Action da Etapa 18 referencia o segredo nominalmente.");
 const download=read("app/api/sac/attachments/[id]/route.ts");
 requireRegex(download,[/auth\.getUser/i,/sac_ticket_attachments/i,/createSignedUrl/i,/60/],"Download autenticado");

 const registry=read("lib/modules/registry.ts");
 for(const key of["crm","clientes","sac"])if(!new RegExp(`key:\\s*"${key}"`).test(registry))errors.push(`Registry sem módulo ${key}.`);
 const layout=read("app/layout.tsx");if(!layout.includes('"./relationship.css"'))errors.push("Layout não importa relationship.css.");
 const clientLayout=read("app/cliente/layout.tsx");
 if(!clientLayout.includes('"Ocorrências"')||!clientLayout.includes('"/cliente/ocorrencias"'))errors.push("Portal não expõe navegação de ocorrências.");
 const docs=read("docs/ETAPA-18-CRM-CLIENTES-SAC.md");
 for(const token of["lead → qualificação","Cliente 360","múltiplas obras","SAC e pós-venda","RLS","Definition of Done"])
  if(!docs.includes(token))errors.push(`Documento da Etapa 18 sem ${token}.`);
}

if(errors.length){console.error(`Etapa 18 inválida (${errors.length} falha(s)):`);for(const error of errors)console.error(`- ${error}`);process.exit(1);}
console.log(`Etapa 18 validada: ${migrations.length} migrations, 10 tabelas novas, RLS, CRM, Cliente 360 multiobra, SAC, portal, uploads autenticados e ${appFiles.length} arquivos de aplicação/documentação.`);