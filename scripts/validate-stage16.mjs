import fs from"node:fs";

const paths={
 schema:"supabase/migrations/20260720143000_stage16_reports_schema.sql",
 security:"supabase/migrations/20260720143100_stage16_reports_security.sql",
 permissionGuard:"supabase/migrations/20260720143150_stage16_permission_boolean_guard.sql",
 module:"supabase/migrations/20260720143200_stage16_reports_module.sql",
 hardening:"supabase/migrations/20260720143300_stage16_reports_hardening.sql",
 integrity:"supabase/migrations/20260720143400_stage16_reports_integrity.sql",
 installerFix:"supabase/migrations/20260720143500_stage16_reports_installer_fix.sql",
 linkFix:"supabase/migrations/20260720143700_stage16_report_link_guard_fix.sql"
};
const files=[...Object.values(paths),
 "lib/reports/metrics.ts","lib/reports/metrics.test.ts","lib/reports/server.ts",
 "app/actions/reports.ts","app/api/relatorios/exportar/route.ts",
 "components/reports/report-navigation.tsx","components/reports/metric-card.tsx",
 "app/app/relatorios/page.tsx","app/app/relatorios/obras/page.tsx","app/app/relatorios/obras/[id]/page.tsx",
 "app/app/relatorios/financeiro/page.tsx","app/app/relatorios/compras/page.tsx","app/app/relatorios/qualidade/page.tsx",
 "app/app/relatorios/metas/page.tsx","app/app/relatorios/salvos/page.tsx","app/app/relatorios/snapshots/page.tsx",
 "app/reports.css","docs/ETAPA-16-RELATORIOS-INDICADORES-EXECUTIVOS.md"
];
const errors=[];
for(const file of files)if(!fs.existsSync(file))errors.push(`Arquivo ausente: ${file}`);
if(errors.length===0){
 const schema=fs.readFileSync(paths.schema,"utf8");
 for(const table of["report_metric_definitions","report_targets","report_saved_views","report_snapshots","report_exports","report_events"])if(!schema.includes(`public.${table}`))errors.push(`Tabela ausente: ${table}`);
 for(const token of["report_project_kpis_v","report_executive_kpis_v","security_invoker=true","protect_completed_report_snapshot","source_sha256"])if(!schema.includes(token))errors.push(`Schema incompleto: ${token}`);
 const security=fs.readFileSync(paths.security,"utf8");
 for(const token of["enable row level security","get_report_dashboard","create_report_snapshot","record_report_export","financialVisible","has_module_permission","sensitive","export"])if(!security.includes(token))errors.push(`Segurança/RPC incompleta: ${token}`);
 const permissionGuard=fs.readFileSync(paths.permissionGuard,"utf8");
 for(const token of["normalize_profile_module_permission_booleans","can_export","can_administer","can_view_sensitive"])if(!permissionGuard.includes(token))errors.push(`Guard de permissões incompleto: ${token}`);
 const moduleSeed=fs.readFileSync(paths.module,"utf8");
 for(const token of["executive-analytics","install_report_defaults","organizations_install_report_defaults","report_metric_definitions","report_targets","overdue_days","ensure_organization_access_profiles","base_role is not null","csvExport","publicDashboards"])if(!moduleSeed.includes(token))errors.push(`Módulo incompleto: ${token}`);
 const hardening=fs.readFileSync(paths.hardening,"utf8");
 for(const token of["procurement_order_stats","procurement_request_stats","procurement_receipt_stats","report_snapshots_select","financialVisible"])if(!hardening.includes(token))errors.push(`Hardening incompleto: ${token}`);
 const integrity=fs.readFileSync(paths.integrity,"utf8");
 for(const token of["validate_report_links","to_jsonb(new)","report_targets_metric_definition_fk","report_exports_snapshot_idx","report_events_actor_idx"])if(!integrity.includes(token))errors.push(`Integridade incompleta: ${token}`);
 const installerFix=fs.readFileSync(paths.installerFix,"utf8");
 for(const token of["ensure_organization_access_profiles","base_role is not null","overdue_days","install_report_defaults"])if(!installerFix.includes(token))errors.push(`Correção do instalador incompleta: ${token}`);
 const linkFix=fs.readFileSync(paths.linkFix,"utf8");
 for(const token of["to_jsonb(new)","saved_view_id","snapshot_id","validate_report_links"])if(!linkFix.includes(token))errors.push(`Correção do validador incompleta: ${token}`);
 const engine=fs.readFileSync("lib/reports/metrics.ts","utf8");
 for(const token of["normalizeReportDashboard","evaluateMetric","targetFor","buildProjectCsv","formatReportNumber"])if(!engine.includes(token))errors.push(`Motor ausente: ${token}`);
 const actions=fs.readFileSync("app/actions/reports.ts","utf8");
 for(const token of["saveReportView","archiveReportView","saveReportTarget","generateReportSnapshot"])if(!actions.includes(`function ${token}`))errors.push(`Ação ausente: ${token}`);
 const route=fs.readFileSync("app/api/relatorios/exportar/route.ts","utf8");
 for(const token of["record_report_export","X-Content-SHA256","text/csv","Cache-Control"])if(!route.includes(token))errors.push(`Exportação incompleta: ${token}`);
}
if(errors.length){console.error(`Etapa 16 inválida (${errors.length} falha(s)):`);for(const error of errors)console.error(`- ${error}`);process.exit(1);}
console.log(`Etapa 16 validada: ${files.length} arquivos críticos, seis tabelas, duas views, RLS, guards multi-tenant, metas, snapshots e exportação auditada.`);
