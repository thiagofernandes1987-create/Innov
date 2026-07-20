import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationFiles = [
  "supabase/migrations/20260719223000_stage12_planning_schema.sql",
  "supabase/migrations/20260719223100_stage12_planning_functions.sql",
  "supabase/migrations/20260719223200_stage12_rls_core.sql",
  "supabase/migrations/20260719223250_stage12_rls_resources.sql",
  "supabase/migrations/20260719223260_stage12_rls_baselines.sql",
  "supabase/migrations/20260719223275_stage12_rls_field_documents.sql",
  "supabase/migrations/20260719223300_stage12_planning_storage.sql",
  "supabase/migrations/20260719223400_stage12_permissions_helpers.sql",
  "supabase/migrations/20260719223450_stage12_permissions_planning.sql",
  "supabase/migrations/20260719223475_stage12_permissions_field.sql",
  "supabase/migrations/20260719223500_stage12_performance_indexes.sql"
];
const requiredFiles = [
  "app/actions/projects.ts","app/app/obras/page.tsx","app/app/obras/novo/page.tsx",
  "app/app/obras/[id]/page.tsx","app/app/obras/[id]/eap/page.tsx",
  "app/app/obras/[id]/cronograma/page.tsx","app/app/obras/[id]/tarefas/page.tsx",
  "app/app/obras/[id]/diario/page.tsx","app/app/obras/[id]/diario/[logId]/page.tsx",
  "app/app/obras/[id]/documentos/page.tsx","app/app/obras/[id]/equipes/page.tsx",
  "app/cliente/obras/page.tsx","app/cliente/obras/[id]/page.tsx",
  "app/cliente/cronograma/page.tsx","app/cliente/documentos/page.tsx","app/cliente/midia/page.tsx",
  ...migrationFiles
];
const migration = migrationFiles.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
const requiredTables = [
  "project_memberships","work_breakdown_items","project_tasks","task_dependencies",
  "project_milestones","schedule_baselines","schedule_baseline_tasks","project_resources",
  "task_resource_allocations","project_teams","project_team_members","daily_logs",
  "daily_log_activities","daily_log_resources","daily_log_media","project_documents",
  "project_document_versions","project_progress_snapshots"
];
const requiredFunctions = [
  "create_project_from_contract","recalculate_project_progress","move_project_task",
  "create_schedule_baseline","submit_daily_log","decide_daily_log",
  "release_project_document_version","can_write_daily_log"
];
const requiredSecurity = [
  "enable row level security","project-documents","daily-log-media","client_released_at",
  "security definer","revoke all on function","storage.objects.name",
  "prevent_released_document_mutation","project_tasks_org_idx","daily_log_media_project_idx"
];
const failures = [];
for (const file of requiredFiles) if (!fs.existsSync(path.join(root, file))) failures.push(`Arquivo ausente: ${file}`);
for (const table of requiredTables) if (!migration.includes(`create table public.${table}`)) failures.push(`Tabela ausente: ${table}`);
for (const fn of requiredFunctions) if (!migration.includes(`function public.${fn}`)) failures.push(`Função ausente: ${fn}`);
for (const token of requiredSecurity) if (!migration.toLowerCase().includes(token.toLowerCase())) failures.push(`Controle ausente: ${token}`);
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(JSON.stringify({ ok:true, stage:12, files:requiredFiles.length, migrations:migrationFiles.length, tables:requiredTables.length, functions:requiredFunctions.length, buckets:2 }, null, 2));
