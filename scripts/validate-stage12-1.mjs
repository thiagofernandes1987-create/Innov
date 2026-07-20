import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const migrationFiles=[
  "supabase/migrations/20260720043000_stage12_1_module_catalog_multi_profiles.sql",
  "supabase/migrations/20260720043100_stage12_1_permission_resolution.sql",
  "supabase/migrations/20260720043200_stage12_1_module_security.sql",
  "supabase/migrations/20260720043300_stage12_1_project_capability_override.sql"
];
const requiredFiles=[
  ...migrationFiles,
  "lib/modules/registry.ts","lib/authorization.ts","app/actions/access-control.ts",
  "app/app/page.tsx","app/app/layout.tsx","proxy.ts",
  "app/app/administracao/page.tsx","app/app/administracao/aplicativos/page.tsx",
  "app/app/administracao/perfis/page.tsx","app/app/administracao/usuarios/page.tsx",
  "docs/DECISAO-ARQUITETURAL-MODULOS-PLUG-AND-PLAY.md"
];
const failures=[];
for(const file of requiredFiles)if(!fs.existsSync(path.join(root,file)))failures.push(`Arquivo ausente: ${file}`);
const migrations=migrationFiles.filter(file=>fs.existsSync(path.join(root,file))).map(file=>fs.readFileSync(path.join(root,file),"utf8")).join("\n");
const requiredRelations=["app_modules","app_module_dependencies","organization_modules","access_profiles","profile_module_permissions","organization_memberships","user_module_permission_overrides","project_module_permission_overrides","permission_change_events","membership_access_profiles"];
const requiredFunctions=["ensure_organization_module_defaults","effective_module_permissions","create_modular_access_profile","set_organization_module_status","assign_user_access_profile","revoke_user_access_profile","set_user_module_capability_override","set_project_module_capability_override"];
const requiredApps=["crm","clientes","obras","planejamento","tarefas","diario","equipes","orcamentos","propostas","contratos","aditivos","assinaturas","documentos","qualidade","compras","estoque","financeiro","sac","relatorios","auditoria","administracao"];
for(const relation of requiredRelations)if(!migrations.includes(`public.${relation}`))failures.push(`Relação modular ausente: ${relation}`);
for(const fn of requiredFunctions)if(!migrations.includes(`function public.${fn}`))failures.push(`Função ausente: ${fn}`);
for(const app of requiredApps)if(!migrations.includes(`'${app}'`))failures.push(`Aplicativo ausente: ${app}`);
for(const token of ["enable row level security","security definer","revoke insert,update,delete","organization_modules","MULTI_PROFILE","USER_DENY","PROJECT_DENY","nulls not distinct","app_module_dependencies"]){if(!migrations.toLowerCase().includes(token.toLowerCase()))failures.push(`Controle ausente: ${token}`);}
const layout=fs.readFileSync(path.join(root,"app/app/layout.tsx"),"utf8");
const proxy=fs.readFileSync(path.join(root,"proxy.ts"),"utf8");
const auth=fs.readFileSync(path.join(root,"lib/authorization.ts"),"utf8");
const actions=fs.readFileSync(path.join(root,"app/actions/access-control.ts"),"utf8");
if(layout.includes("const navItems"))failures.push("Menu ainda estático.");
if(!layout.includes("getEffectiveApplications"))failures.push("Menu não usa permissões efetivas.");
if(!proxy.includes("has_module_permission"))failures.push("Proxy não usa a autorização homologada.");
if(!auth.includes("list_my_modules")||!auth.includes("requireCapability"))failures.push("Resolução modular homologada ausente.");
if(!actions.includes("assign_user_access_profile")||!actions.includes("set_project_module_capability_override"))failures.push("Administração de perfis múltiplos ou overrides por obra ausente.");
if(failures.length){console.error(failures.join("\n"));process.exit(1);}
console.log(JSON.stringify({ok:true,stage:"12.1",files:requiredFiles.length,relations:requiredRelations.length,functions:requiredFunctions.length,applications:requiredApps.length},null,2));
