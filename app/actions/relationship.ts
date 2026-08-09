"use server";

import{randomUUID}from"node:crypto";
import { lerMoeda } from "@/lib/validacao/moeda";
import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireClientContext}from"@/lib/auth";
import{requireCapability}from"@/lib/authorization";
import { listaDoEscopo, pertenceALista } from "@/lib/listas/servidor";
import { ESCOPOS } from "@/lib/sugestoes/servidor";
import{
 FILE_SECURITY_SAC_MIME_TYPES,
 fileSecurityMessage,
 sanitizeFileName
}from"@/lib/file-security/domain";
import{secureUpload}from"@/lib/file-security/server";
import{createSupabaseAdminClient}from"@/lib/supabase/admin";
import{checarCamposBR}from"@/lib/validacao/formulario";

function text(data:FormData,key:string){return String(data.get(key)??"").trim();}
function optional(data:FormData,key:string){return text(data,key)||null;}
// Lê valor monetário tolerando o que gente digita e o que planilha cola:
// "1.500,25", "1500.25" e "R$ 1.500,00" chegam ao mesmo número. `Number()` cru
// lia "1.500" como 1,5 — erro de três ordens de grandeza num campo de dinheiro.
function numberOrNull(value:unknown){return lerMoeda(value as string|number|null|undefined);}
function boolean(data:FormData,key:string){return data.get(key)!==null;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}
function resultRow<T extends Record<string,unknown>>(value:T|T[]|null){return Array.isArray(value)?value[0]??null:value;}

export async function createCrmLead(data:FormData){
 const context=await requireCapability("crm","create");const path="/app/crm/leads/novo";
 const invalido=checarCamposBR(data,[
  {campo:"email",tipo:"email",rotulo:"E-mail"},
  {campo:"phone",tipo:"telefone",rotulo:"Telefone/WhatsApp"},
  {campo:"taxId",tipo:"documento",rotulo:"CPF/CNPJ"}
 ]);
 if(invalido)fail(path,invalido);
 const{data:lead,error}=await context.supabase.rpc("create_crm_lead",{
  p_organization_id:context.organizationId,p_full_name:text(data,"fullName"),p_company_name:optional(data,"companyName"),
  p_email:optional(data,"email"),p_phone:optional(data,"phone"),p_tax_id:optional(data,"taxId"),p_source:optional(data,"source"),
  p_campaign:optional(data,"campaign"),p_interest:optional(data,"interest"),p_estimated_budget:numberOrNull(text(data,"estimatedBudget")),
  p_city:optional(data,"city"),p_state:optional(data,"state"),p_owner_id:optional(data,"ownerId"),p_next_follow_up_at:optional(data,"nextFollowUpAt"),
  p_notes:optional(data,"notes"),p_consent_contact:boolean(data,"consentContact"),p_consent_source:optional(data,"consentSource"),
  p_idempotency_key:text(data,"idempotencyKey")||randomUUID()
 });
 if(error)fail(path,error.message);const row=resultRow(lead as Record<string,unknown>|Record<string,unknown>[]|null);redirect(`/app/crm/leads/${row?.id??""}`);
}

export async function moveCrmLeadStage(data:FormData){
 const id=text(data,"leadId");const context=await requireCapability("crm","update");
 const{error}=await context.supabase.rpc("move_crm_lead_stage",{p_lead_id:id,p_to_stage:text(data,"stage"),p_reason:optional(data,"reason")});
 if(error)fail(`/app/crm/leads/${id}`,error.message);revalidatePath(`/app/crm/leads/${id}`);revalidatePath("/app/crm");
}

export async function convertCrmLead(data:FormData){
 const id=text(data,"leadId");const context=await requireCapability("crm","update");
 const{data:conversion,error}=await context.supabase.rpc("convert_crm_lead",{p_lead_id:id,p_create_opportunity:boolean(data,"createOpportunity"),p_opportunity_title:optional(data,"opportunityTitle"),p_estimated_value:numberOrNull(text(data,"estimatedValue"))});
 if(error)fail(`/app/crm/leads/${id}`,error.message);const result=conversion&&typeof conversion==="object"?conversion as Record<string,unknown>:{};redirect(`/app/clientes/${result.clientId??""}`);
}

export async function moveCrmOpportunityStage(data:FormData){
 const id=text(data,"opportunityId");const context=await requireCapability("crm","update");
 const path=`/app/crm/oportunidades/${id}`;
 const estagio=text(data,"stage");
 const motivo=optional(data,"reason");

 // Conferência no servidor, e não só no `required` do rádio. O que chega aqui
 // é um POST, e um POST montado à mão gravaria qualquer texto em `lost_reason`
 // — que é justamente a coluna que precisa ser contável. Guarda de tela protege
 // a tela; esta protege o dado.
 if(estagio==="LOST"){
  const lista=await listaDoEscopo(context.supabase,context.organizationId,ESCOPOS.motivoDePerda);
  if(lista.length===0)fail(path,"Nenhum motivo de perda cadastrado. Cadastre em Administração → Motivos de perda.");
  if(!motivo||!pertenceALista(lista,motivo))fail(path,"Escolha um dos motivos de perda cadastrados.");
 }

 const{error}=await context.supabase.rpc("move_crm_opportunity_stage",{
  p_opportunity_id:id,p_to_stage:estagio,p_reason:motivo,p_note:optional(data,"note")
 });
 if(error)fail(path,error.message);
 revalidatePath(path);revalidatePath("/app/crm");
}

export async function createRelationshipClient(data:FormData){
 const context=await requireCapability("clientes","create");const path="/app/clientes/novo";
 const invalido=checarCamposBR(data,[
  {campo:"email",tipo:"email",rotulo:"E-mail"},
  {campo:"phone",tipo:"telefone",rotulo:"Telefone"},
  {campo:"taxId",tipo:"documento",rotulo:"CPF/CNPJ",campoTipoPessoa:"type"},
  {campo:"postalCode",tipo:"cep",rotulo:"CEP"}
 ]);
 if(invalido)fail(path,invalido);
 const{data:client,error}=await context.supabase.from("clients").insert({
  organization_id:context.organizationId,type:text(data,"type")||"PERSON",legal_name:text(data,"legalName"),trade_name:optional(data,"tradeName"),
  tax_id:optional(data,"taxId"),email:optional(data,"email"),phone:optional(data,"phone"),status:"ACTIVE",address_line:optional(data,"addressLine"),
  city:optional(data,"city"),state:optional(data,"state"),postal_code:optional(data,"postalCode"),notes:optional(data,"notes"),source:optional(data,"source"),
  segment:optional(data,"segment"),preferred_contact_channel:text(data,"preferredContactChannel")||"EMAIL",lifecycle_stage:text(data,"lifecycleStage")||"CUSTOMER",
  assigned_owner_id:optional(data,"ownerId"),next_follow_up_at:optional(data,"nextFollowUpAt"),created_by:context.userId
 }).select("id").single();
 if(error)fail(path,error.message);redirect(`/app/clientes/${client.id}`);
}

export async function updateRelationshipClient(data:FormData){
 const id=text(data,"clientId");const context=await requireCapability("clientes","update");const path=`/app/clientes/${id}`;
 const invalido=checarCamposBR(data,[
  {campo:"email",tipo:"email",rotulo:"E-mail"},
  {campo:"phone",tipo:"telefone",rotulo:"Telefone"},
  {campo:"taxId",tipo:"documento",rotulo:"CPF/CNPJ",campoTipoPessoa:"type"},
  {campo:"postalCode",tipo:"cep",rotulo:"CEP"}
 ]);
 if(invalido)fail(path,invalido);
 const{error}=await context.supabase.from("clients").update({
  type:text(data,"type"),legal_name:text(data,"legalName"),trade_name:optional(data,"tradeName"),tax_id:optional(data,"taxId"),email:optional(data,"email"),phone:optional(data,"phone"),
  address_line:optional(data,"addressLine"),city:optional(data,"city"),state:optional(data,"state"),postal_code:optional(data,"postalCode"),notes:optional(data,"notes"),source:optional(data,"source"),
  segment:optional(data,"segment"),preferred_contact_channel:text(data,"preferredContactChannel"),lifecycle_stage:text(data,"lifecycleStage"),assigned_owner_id:optional(data,"ownerId"),
  next_follow_up_at:optional(data,"nextFollowUpAt"),last_contact_at:optional(data,"lastContactAt"),updated_at:new Date().toISOString()
 }).eq("id",id).eq("organization_id",context.organizationId);
 if(error)fail(path,error.message);revalidatePath(path);revalidatePath("/app/clientes");
}

export async function addClientContact(data:FormData){
 const clientId=text(data,"clientId");const context=await requireCapability("clientes","update");const path=`/app/clientes/${clientId}`;
 const{error}=await context.supabase.from("client_contacts").insert({organization_id:context.organizationId,client_id:clientId,full_name:text(data,"fullName"),role_title:optional(data,"roleTitle"),email:optional(data,"email"),phone:optional(data,"phone"),preferred_channel:text(data,"preferredChannel")||"EMAIL",is_primary:boolean(data,"primary"),notes:optional(data,"notes"),created_by:context.userId});
 if(error)fail(path,error.message);revalidatePath(path);
}

export async function recordClientConsent(data:FormData){
 const clientId=text(data,"clientId");const context=await requireCapability("clientes","update");const path=`/app/clientes/${clientId}`;
 const{error}=await context.supabase.from("client_consents").insert({organization_id:context.organizationId,client_id:clientId,kind:text(data,"kind"),granted:text(data,"granted")==="true",source:text(data,"source"),evidence:optional(data,"evidence"),occurred_at:optional(data,"occurredAt")??new Date().toISOString(),created_by:context.userId});
 if(error)fail(path,error.message);revalidatePath(path);
}

export async function recordRelationshipActivity(data:FormData){
 const context=await requireCapability(text(data,"moduleKey")||"crm","update");const returnPath=text(data,"returnPath")||"/app/crm";
 const{error}=await context.supabase.rpc("record_crm_activity",{p_organization_id:context.organizationId,p_activity_type:text(data,"activityType"),p_subject:text(data,"subject"),p_description:optional(data,"description"),p_lead_id:optional(data,"leadId"),p_opportunity_id:optional(data,"opportunityId"),p_client_id:optional(data,"clientId"),p_ticket_id:optional(data,"ticketId"),p_occurred_at:optional(data,"occurredAt"),p_due_at:optional(data,"dueAt"),p_owner_id:optional(data,"ownerId")});
 if(error)fail(returnPath,error.message);revalidatePath(returnPath);revalidatePath("/app/crm");
}

export async function createSacTicket(data:FormData){
 const projectId=optional(data,"projectId");const context=await requireCapability("sac","create",projectId);const path="/app/ocorrencias/novo";
 const{data:ticket,error}=await context.supabase.rpc("create_sac_ticket",{p_organization_id:context.organizationId,p_client_id:text(data,"clientId"),p_project_id:projectId,p_contract_id:optional(data,"contractId"),p_category_id:optional(data,"categoryId"),p_title:text(data,"title"),p_description:text(data,"description"),p_source:text(data,"source")||"INTERNAL",p_priority:text(data,"priority")||"NORMAL",p_idempotency_key:text(data,"idempotencyKey")||randomUUID()});
 if(error)fail(path,error.message);const row=resultRow(ticket as Record<string,unknown>|Record<string,unknown>[]|null);redirect(`/app/ocorrencias/${row?.id??""}`);
}

export async function createClientSacTicket(data:FormData){
 const{client,supabase}=await requireClientContext();const path="/cliente/ocorrencias/novo";
 const{data:ticket,error}=await supabase.rpc("create_sac_ticket",{p_organization_id:client.organization_id,p_client_id:client.id,p_project_id:optional(data,"projectId"),p_contract_id:optional(data,"contractId"),p_category_id:optional(data,"categoryId"),p_title:text(data,"title"),p_description:text(data,"description"),p_source:"PORTAL",p_priority:"NORMAL",p_idempotency_key:text(data,"idempotencyKey")||randomUUID()});
 if(error)fail(path,error.message);const row=resultRow(ticket as Record<string,unknown>|Record<string,unknown>[]|null);redirect(`/cliente/ocorrencias/${row?.id??""}`);
}

export async function addSacTicketMessage(data:FormData){
 const id=text(data,"ticketId");const portal=text(data,"portal")==="true";const path=portal?`/cliente/ocorrencias/${id}`:`/app/ocorrencias/${id}`;
 const supabase=portal?(await requireClientContext()).supabase:(await requireCapability("sac","update",optional(data,"projectId"))).supabase;
 const{error}=await supabase.rpc("add_sac_ticket_message",{p_ticket_id:id,p_visibility:portal?"CLIENT":text(data,"visibility")||"CLIENT",p_body:text(data,"body"),p_idempotency_key:text(data,"idempotencyKey")||randomUUID()});
 if(error)fail(path,error.message);revalidatePath(path);
}

export async function assignSacTicket(data:FormData){
 const id=text(data,"ticketId");const context=await requireCapability("sac","update",optional(data,"projectId"));
 const{error}=await context.supabase.rpc("assign_sac_ticket",{p_ticket_id:id,p_assigned_to:optional(data,"assignedTo")});
 if(error)fail(`/app/ocorrencias/${id}`,error.message);revalidatePath(`/app/ocorrencias/${id}`);revalidatePath("/app/ocorrencias");
}

export async function transitionSacTicket(data:FormData){
 const id=text(data,"ticketId");const context=await requireCapability("sac","update",optional(data,"projectId"));
 const{error}=await context.supabase.rpc("transition_sac_ticket",{p_ticket_id:id,p_to_status:text(data,"status"),p_reason:optional(data,"reason")});
 if(error)fail(`/app/ocorrencias/${id}`,error.message);revalidatePath(`/app/ocorrencias/${id}`);revalidatePath("/app/ocorrencias");
}

export async function rateSacTicket(data:FormData){
 const id=text(data,"ticketId");const{supabase}=await requireClientContext();
 const{error}=await supabase.rpc("rate_sac_ticket",{p_ticket_id:id,p_score:Number(text(data,"score")),p_comment:optional(data,"comment")});
 if(error)fail(`/cliente/ocorrencias/${id}`,error.message);revalidatePath(`/cliente/ocorrencias/${id}`);
}

async function uploadSacAttachment(data:FormData,portal:boolean){
 const ticketId=text(data,"ticketId");const file=data.get("file");const path=portal?`/cliente/ocorrencias/${ticketId}`:`/app/ocorrencias/${ticketId}`;
 if(!(file instanceof File)||file.size===0)fail(path,"Selecione um arquivo.");
 if(!FILE_SECURITY_SAC_MIME_TYPES.has(file.type))fail(path,"Formato não permitido. Envie PDF, DOCX, JPG, PNG ou WebP.");
 let organizationId:string;let actorUserId:string;let supabase;
 if(portal){const context=await requireClientContext();organizationId=context.client.organization_id;actorUserId=context.user.id;supabase=context.supabase;}
 else{const context=await requireCapability("sac","update",optional(data,"projectId"));organizationId=context.organizationId;actorUserId=context.userId;supabase=context.supabase;}
 const buffer=Buffer.from(await file.arrayBuffer());
 const safeName=sanitizeFileName(file.name);
 const storagePath=`${organizationId}/${ticketId}/${randomUUID()}-${safeName}`;
 let secured;
 try{
  secured=await secureUpload({
   targetBucket:"crm-sac-attachments",targetPath:storagePath,body:buffer,filename:safeName,
   contentType:file.type,organizationId,actorUserId
  });
 }catch(error){fail(path,fileSecurityMessage(error));}
 const{error}=await supabase.rpc("register_sac_ticket_attachment",{
  p_ticket_id:ticketId,p_message_id:optional(data,"messageId"),p_storage_path:storagePath,
  p_file_name:safeName,p_mime_type:file.type,p_size_bytes:secured.sizeBytes,p_sha256:secured.sha256,
  p_client_visible:portal?true:boolean(data,"clientVisible"),p_security_scan_id:secured.scanId,
  p_security_provider:secured.provider,p_security_scanned_at:secured.scannedAt
 });
 if(error){await createSupabaseAdminClient().storage.from("crm-sac-attachments").remove([storagePath]);fail(path,"O arquivo foi analisado, mas não pôde ser vinculado ao chamado.");}
 revalidatePath(path);
}

export async function uploadSacTicketAttachment(data:FormData){return uploadSacAttachment(data,false);}
export async function uploadClientSacTicketAttachment(data:FormData){return uploadSacAttachment(data,true);}
