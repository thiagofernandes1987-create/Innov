import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const requiredFiles=[
  "supabase/migrations/20260720043000_stage12_1_modular_access_core.sql",
  "lib/modules/registry.ts","lib/authorization.ts","app/actions/access-control.ts",
  "app/app/page.tsx","app/app/layout.tsx","proxy.ts",
  "app/app/administracao/page.tsx","app/app/administracao/aplicativos/page.tsx",
  "app/app/administracao/perfis/page.tsx","app/app/administracao/usuarios/page.tsx",
  "docs/DECISAO-ARQUITETURAL-MODULOS-PLUG-AND-PLAY.md"
];
const migration=fs.readFileSync(path.join(root,requiredFiles[0]),"utf8");
const requiredTables=["applications","organization_applications","application_capabilities","access_profiles","profile_capabilities","user_profile_assignments","user_capability_overrides","permission_audit_events"];
const requiredFunctions=["has_effective_capability","list_effective_applications","set_organization_application_state","create_access_profile","set_profile_access_level","assign_access_profile","set_user_capability_override"];
const requiredApps=["crm","clients","works","planning","tasks","daily","teams","budgets","proposals","contracts","addenda","signatures","documents","quality","purchases","inventory","finance","service","audit","administration"];
const failures=[];
for(const file of requiredFiles)if(!fs.existsSync(path.join(root,file)))failures.push(`Arquivo ausente: ${file}`);
for(const table of requiredTables)if(!migration.includes(`table if not exists public.${table}`))failures.push(`Tabela ausente: ${table}`);
for(const fn of requiredFunctions)if(!migration.includes(`function public.${fn}`))failures.push(`Função ausente: ${fn}`);
for(const app of requiredApps)if(!migration.includes(`'${app}'`))failures.push(`Aplicativo ausente: ${app}`);
for(const token of ["enable row level security","permission_audit_events","permission_effect","module_lifecycle_state","revoke insert,update,delete","security definer","DENY","ALLOW"]){if(!migration.toLowerCase().includes(token.toLowerCase()))failures.push(`Controle ausente: ${token}`);}
const layout=fs.readFileSync(path.join(root,"app/app/layout.tsx"),"utf8");
const proxy=fs.readFileSync(path.join(root,"proxy.ts"),"utf8");
const auth=fs.readFileSync(path.join(root,"lib/authorization.ts"),"utf8");
if(layout.includes("const navItems"))failures.push("Menu ainda estático.");
if(!layout.includes("getEffectiveApplications"))failures.push("Menu não usa permissões efetivas.");
if(!proxy.includes("has_effective_capability"))failures.push("Proxy não bloqueia capacidade no servidor.");
if(!auth.includes("requireCapability"))failures.push("Guard de capacidade ausente.");
if(failures.length){console.error(failures.join("\n"));process.exit(1);}
console.log(JSON.stringify({ok:true,stage:"12.1",files:requiredFiles.length,tables:requiredTables.length,functions:requiredFunctions.length,applications:requiredApps.length},null,2));
