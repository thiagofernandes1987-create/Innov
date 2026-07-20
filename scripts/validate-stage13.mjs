import fs from "node:fs";

const requiredFiles=[
  "supabase/migrations/20260720080000_stage13_quality_forms_schema.sql",
  "supabase/migrations/20260720080100_stage13_quality_forms_security.sql",
  "supabase/migrations/20260720080200_stage13_quality_forms_seed.sql",
  "app/actions/quality.ts",
  "lib/quality/forms.ts",
  "components/quality/quality-form-renderer.tsx",
  "components/quality/quality-form-builder.tsx",
  "app/app/qualidade/page.tsx",
  "app/app/qualidade/documentos/page.tsx",
  "app/app/qualidade/formularios/page.tsx",
  "app/app/qualidade/preenchimentos/page.tsx",
  "app/formularios/[token]/page.tsx",
  "app/cliente/formularios/page.tsx",
  "python/quality_forms/models.py",
  "python/quality_forms/render.py",
  "python/tests/test_quality_forms.py"
];
const errors=[];
for(const file of requiredFiles)if(!fs.existsSync(file))errors.push(`Arquivo ausente: ${file}`);
const schema=fs.readFileSync(requiredFiles[0],"utf8");
for(const table of ["quality_documents","quality_form_templates","quality_form_versions","quality_form_assignments","quality_public_links","quality_form_responses","quality_form_answers","quality_form_events"]){if(!schema.includes(`public.${table}`))errors.push(`Tabela ausente: ${table}`);}
for(const bucket of ["quality-documents","quality-form-attachments"])if(!schema.includes(bucket))errors.push(`Bucket ausente: ${bucket}`);
const security=fs.readFileSync(requiredFiles[1],"utf8");
for(const token of ["enable row level security","has_module_permission","publish_quality_form_version","review_quality_response","quality_client_matches","revoke all"]){if(!security.toLowerCase().includes(token.toLowerCase()))errors.push(`Segurança incompleta: ${token}`);}
const seed=fs.readFileSync(requiredFiles[2],"utf8");
for(const token of ["FVS-PADRAO","FVM-PADRAO","PESQUISA-SATISFACAO","qualidade","profile_capabilities"]){if(!seed.includes(token))errors.push(`Seed incompleto: ${token}`);}
const actions=fs.readFileSync("app/actions/quality.ts","utf8");
for(const action of ["uploadQualityDocument","createQualityTemplate","createQualityAssignment","submitPublicQualityForm","submitClientQualityForm","submitInternalQualityForm","reviewQualityResponse"]){if(!actions.includes(`function ${action}`))errors.push(`Ação ausente: ${action}`);}
const python=fs.readFileSync("python/quality_forms/models.py","utf8");
for(const symbol of ["class FormDefinition","build_fvs_template","build_fvm_template","evaluate_form"]){if(!python.includes(symbol))errors.push(`Motor Python incompleto: ${symbol}`);}
if(errors.length){console.error(`Etapa 13 inválida (${errors.length} falha(s)):`);for(const error of errors)console.error(`- ${error}`);process.exit(1);}
console.log(`Etapa 13 validada: ${requiredFiles.length} arquivos críticos, 8 tabelas, 2 buckets, RLS, modelos FVS/FVM, formulários internos e pesquisas.`);
