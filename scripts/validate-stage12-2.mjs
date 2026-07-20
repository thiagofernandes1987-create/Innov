import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const migrations=[
  "supabase/migrations/20260720054000_stage12_2_advanced_signature_schema.sql",
  "supabase/migrations/20260720054100_stage12_2_tokens_and_conversion_jobs.sql",
  "supabase/migrations/20260720054200_stage12_2_document_layout_workflow.sql",
  "supabase/migrations/20260720054210_stage12_2_external_signing.sql",
  "supabase/migrations/20260720054220_stage12_2_finalization_delivery.sql",
  "supabase/migrations/20260720054300_stage12_2_signature_rls.sql",
  "supabase/migrations/20260720054310_stage12_2_signature_storage.sql",
  "supabase/migrations/20260720054320_stage12_2_signature_privileges.sql",
  "supabase/migrations/20260720054330_stage12_2_client_signature_visibility.sql",
  "supabase/migrations/20260720054340_stage12_2_delivery_processing_status.sql",
  "supabase/migrations/20260720054341_stage12_2_delivery_worker_lock.sql"
];
const files=[
  ...migrations,
  "app/actions/advanced-signatures.ts",
  "app/actions/public-signing.ts",
  "app/app/assinaturas/page.tsx",
  "app/app/assinaturas/novo/page.tsx",
  "app/app/assinaturas/documentos/[id]/page.tsx",
  "app/assinar/[token]/page.tsx",
  "app/cliente/assinaturas/page.tsx",
  "app/api/documents/signatures/[envelopeId]/route.ts",
  "components/signatures/signature-pad.tsx",
  "lib/signatures/crypto.ts",
  "scripts/run-signature-conversion-worker.mjs",
  "scripts/run-signature-delivery-worker.mjs"
];
const failures=[];
for(const file of files)if(!fs.existsSync(path.join(root,file)))failures.push(`Arquivo ausente: ${file}`);
const sql=migrations.filter(file=>fs.existsSync(path.join(root,file))).map(file=>fs.readFileSync(path.join(root,file),"utf8")).join("\n");
const tables=["signature_documents","signature_document_versions","signature_fields","signature_field_values","signature_attachments","signature_delivery_events","signature_evidence_records","signature_access_tokens","signature_conversion_jobs"];
const functions=["create_advanced_signature_document","create_advanced_signature_envelope","add_advanced_signature_field","freeze_advanced_signature_layout","record_advanced_signature_field_value","mark_advanced_signer_complete","finalize_advanced_signature_envelope","queue_signature_copy_delivery","get_advanced_signing_context","list_advanced_signer_fields","lock_signature_conversion_job","lock_signature_delivery_event"];
const fieldTypes=["SIGNATURE","INITIALS","DATE","FULL_NAME","TEXT","CHECKBOX","PHOTO","ATTACHMENT"];
for(const table of tables)if(!sql.includes(`public.${table}`))failures.push(`Tabela ausente: ${table}`);
for(const fn of functions)if(!sql.includes(`function public.${fn}`))failures.push(`Função ausente: ${fn}`);
for(const type of fieldTypes)if(!sql.includes(`'${type}'`))failures.push(`Tipo de campo ausente: ${type}`);
for(const token of ["token_sha256","original_sha256","rendered_pdf_sha256","final_pdf_sha256","audit_artifact_sha256","enable row level security","signature-artifacts","security definer","service_role","layout_frozen_at","client_released_at"]){if(!sql.toLowerCase().includes(token.toLowerCase()))failures.push(`Controle ausente: ${token}`);}
const publicActions=fs.readFileSync(path.join(root,"app/actions/public-signing.ts"),"utf8");
const internalActions=fs.readFileSync(path.join(root,"app/actions/advanced-signatures.ts"),"utf8");
const conversionWorker=fs.readFileSync(path.join(root,"scripts/run-signature-conversion-worker.mjs"),"utf8");
const deliveryWorker=fs.readFileSync(path.join(root,"scripts/run-signature-delivery-worker.mjs"),"utf8");
if(!publicActions.includes("createSupabaseAdminClient")||!publicActions.includes("record_advanced_signature_field_value"))failures.push("Fluxo público não usa API server-side protegida.");
if(!internalActions.includes("PDFDocument")||!internalActions.includes("finalize_advanced_signature_envelope"))failures.push("Finalização PDF server-side ausente.");
if(!conversionWorker.includes("soffice")||!conversionWorker.includes("complete_signature_conversion_job"))failures.push("Worker DOCX real ausente.");
if(!deliveryWorker.includes("createHmac")||!deliveryWorker.includes("SIGNATURE_EMAIL_WEBHOOK_SECRET"))failures.push("Entrega por e-mail assinada ausente.");
if(failures.length){console.error(failures.join("\n"));process.exit(1);}
console.log(JSON.stringify({ok:true,stage:"12.2",files:files.length,migrations:migrations.length,tables:tables.length,functions:functions.length,fieldTypes:fieldTypes.length},null,2));
