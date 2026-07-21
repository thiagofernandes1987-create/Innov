import fs from"node:fs";

const migrations=[
 "supabase/migrations/20260721093000_stage19_observability_schema.sql",
 "supabase/migrations/20260721093100_stage19_observability_security.sql",
 "supabase/migrations/20260721093200_stage19_observability_functions.sql",
 "supabase/migrations/20260721093300_stage19_observability_unified_stream.sql",
 "supabase/migrations/20260721093400_stage19_observability_module_performance.sql"
];
const testFile="supabase/tests/stage19_observability_homologation.sql";
const appFiles=[
 "lib/observability/domain.ts","lib/observability/server.ts","app/actions/observability.ts",
 "components/observability/observability-navigation.tsx","app/app/auditoria/page.tsx","app/app/auditoria/eventos/page.tsx",
 "app/app/auditoria/eventos/[id]/page.tsx","app/app/auditoria/alertas/page.tsx","app/app/auditoria/saude/page.tsx",
 "app/app/auditoria/configuracao/page.tsx","app/observability.css","docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md"
];
const errors=[];const read=file=>fs.readFileSync(file,"utf8");
for(const file of[...migrations,testFile,...appFiles])if(!fs.existsSync(file))errors.push(`Arquivo ausente: ${file}`);
function requireRegex(content,patterns,label){for(const pattern of patterns)if(!pattern.test(content))errors.push(`${label} não atende ${pattern}`);}

if(!errors.length){
 const schema=read(migrations[0]);
 for(const table of["observability_alert_rules","observability_alerts","observability_health_checks","observability_diagnostics","observability_retention_policies"])
  if(!new RegExp(`create table if not exists public\\.${table}`).test(schema))errors.push(`Schema sem ${table}.`);
 requireRegex(schema,[/alter table public\.audit_events/i,/severity text/i,/source text/i,/ip_sha256/i,/retention_until/i],"Schema");

 const security=read(migrations[1]);
 requireRegex(security,[/has_module_permission\(organization_id,'auditoria','READ'/i,/stage19_protect_append_only/i,/revoke all on public\.audit_events/i,/from anon,authenticated/i],"Segurança");
 const functions=read(migrations[2]);
 requireRegex(functions,[/sanitize_audit_json/i,/record_audit_event/i,/deduplication_key/i,/acknowledge_observability_alert/i,/resolve_observability_alert/i,/run_observability_health_snapshot/i,/get_observability_dashboard/i,/\[REDACTED\]/i],"Funções");
 const stream=read(migrations[3]);
 for(const source of["audit_events","permission_change_events","signature_events","document_access_logs","quality_form_events","procurement_events","finance_events","report_events","inventory_events","sac_ticket_events","crm_opportunity_stage_history","crm_activities"])
  if(!stream.includes(source))errors.push(`Fluxo unificado sem ${source}.`);
 requireRegex(stream,[/get_observability_events/i,/get_observability_event_detail/i,/sanitize_audit_json/i,/p_page_size/i],"Fluxo unificado");
 const module=read(migrations[4]);
 requireRegex(module,[/'auditoria'/i,/install_observability_defaults/i,/SUPER_ADMIN/i,/DIRECAO/i,/ADMINISTRADOR/i,/audit_events_org_dedup_uidx/i,/record_observability_diagnostic/i],"Módulo e performance");

 const test=read(testFile);
 for(const name of["module_installation","default_alert_rules","event_idempotency","recursive_sanitization","critical_alert","unified_stream","audit_append_only","alert_workflow","health_snapshot","multi_company_isolation"])
  if(!test.includes(`'${name}'`))errors.push(`Teste ausente: ${name}`);
 if(!/^begin;/mi.test(test)||!/rollback;\s*$/i.test(test))errors.push("Homologação da Etapa 19 precisa terminar com ROLLBACK.");
 if(!test.includes("request.jwt.claims")||!test.includes("set local role authenticated"))errors.push("Homologação não simula RLS autenticada.");

 const server=read("lib/observability/server.ts");
 requireRegex(server,[/requireCapability\("auditoria","read"\)/,/get_observability_events/i,/observability_alerts/i,/observability_health_checks/i],"Server");
 const actions=read("app/actions/observability.ts");
 requireRegex(actions,[/requireCapability\("auditoria","manage"\)/,/acknowledge_observability_alert/i,/resolve_observability_alert/i,/run_observability_health_snapshot/i],"Ações");
 const layout=read("app/layout.tsx");if(!layout.includes('"./observability.css"'))errors.push("Layout não importa observability.css.");
 const docs=read("docs/ETAPA-19-AUDITORIA-OBSERVABILIDADE.md");
 for(const token of["fluxo unificado","correlation_id","append-only","RLS","alertas","health checks","diagnósticos","Definition of Done"])
  if(!docs.toLowerCase().includes(token.toLowerCase()))errors.push(`Documento da Etapa 19 sem ${token}.`);
}

if(errors.length){console.error(`Etapa 19 inválida (${errors.length} falha(s)):`);for(const error of errors)console.error(`- ${error}`);process.exit(1);}
console.log(`Etapa 19 validada: ${migrations.length} migrations, 5 tabelas de observabilidade, fluxo unificado, alertas, saúde, diagnósticos, RLS e ${appFiles.length} arquivos de aplicação/documentação.`);
