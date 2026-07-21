"use server";

import{createHash,randomUUID}from"node:crypto";
import{revalidatePath}from"next/cache";
import{redirect}from"next/navigation";
import{requireClientContext}from"@/lib/auth";
import{requireCapability}from"@/lib/authorization";
import{createSupabaseAdminClient}from"@/lib/supabase/admin";

function text(data:FormData,key:string){return String(data.get(key)??"").trim();}
function optional(data:FormData,key:string){return text(data,key)||null;}
function numberOrNull(value:unknown){if(value===null||value===undefined||String(value).trim()==="")return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null;}
function boolean(data:FormData,key:string){return data.get(key)!==null;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}
function resultRow<T extends Record<string,unknown>>(value:T|T[]|null){return Array.isArray(value)?value[0]??null:value;}
function cleanFileName(name:string){return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").slice(0,120)||"arquivo";}
const ALLOWED_FILES=new Set(["application/pdf","image/jpeg","image/png","image/webp","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

export async function createCrmLead(data:FormData){
 const context=await requireCapability("crm","create");const path="/app/crm/leads/novo";
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

export async function createCrmOpportunity(data:FormData){
 const context=await requireCapability("crm","create");const path="/app/crm/oportunidades/novo";
 const{data:opportunity,error}=await context.supabase.rpc("create_crm_opportunity",{
  p_organization_id:context.organizationId,p_client_id:optional(data,"clientId"),p_lead_id:optional(data,"leadId"),p_title:text(data,"title"),
  p_description:optional(data,"description"),p_estimated_value:numberOrNull(text(data,"estimatedValue")),p_stage:text(data,"stage")||"PROSPECTING",
  p_probability:numberOrNull(text(data,"probability"))??25,p_expected_close_date:optional(data,"expectedCloseDate"),p_source:optional(data,"source"),p_owner_id:optional(data,"ownerId")
 });
 if(error)fail(path,error.message);const row=resultRow(opportunity as Record<string,unknown>|Record<string,unknown>[]|null);redirect(`/app/crm/oportunidades/${row?.id??""}`);
}

export async function moveCrmOpportunityStage(data:FormData){
 const id=text(data,"opportunityId");const context=await requireCapability("crm","update");
 const{error}=await context.supabase.rpc("move_crm_opportunity_stage",{p_opportunity_id:id,p_to_stage:text(data,"stage"),p_reason:optional(data,"reason")});
 if(error)fail(`/app/crm/oportunidades/${id}`,error.message);revalidatePath(`/app/crm/oportunidades/${id}`);revalidatePath("/app/crm");
}

export async function createRelationshipClient(data:FormData){
 const context=await requireCapability("clientes","create");const path="/app/clientes/novo";
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
 const{client,supabase}=await requireClientContext();const path="/cliente/atendimento/novo";
 const{data:ticket,error}=await supabase.rpc("create_sac_ticket",{p_organization_id:client.organization_id,p_client_id:client.id,p_project_id:optional(data,"projectId"),p_contract_id:optional(data,"contractId"),p_category_id:optional(data,"categoryId"),p_title:text(data,"title"),p_description:text(data,"description"),p_source:"PORTAL",p_priority:"NORMAL",p_idempotency_key:text(data,"idempotencyKey")||randomUUID()});
 if(error)fail(path,error.message);const row=resultRow(ticket as Record<string,unknown>|Record<string,unknown>[]|null);redirect(`/cliente/atendimento/${row?.id??""}`);
}

export async function addSacTicketMessage(data:FormData){
 const id=text(data,"ticketId");const portal=text(data,"portal")==="true";const path=portal?`/cliente/atendimento/${id}`:`/app/ocorrencias/${id}`;
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
 if(error)fail(`/cliente/atendimento/${id}`,error.message);revalidatePath(`/cliente/atendimento/${id}`);
}

async function uploadSacAttachment(data:FormData,portal:boolean){
 const ticketId=text(data,"ticketId");const file=data.get("file");const path=portal?`/cliente/atendimento/${ticketId}`:`/app/ocorrencias/${ticketId}`;
 if(!(file instanceof File)||file.size===0)fail(path,"Selecione um arquivo.");
 if(file.size>26214400)fail(path,"O arquivo excede 25 MB.");
 if(!ALLOWED_FILES.has(file.type))fail(path,"Formato não permitido. Envie PDF, DOCX, JPG, PNG ou WebP.");
 const actor=portal?await requireClientContext():await requireCapability("sac","update",optional(data,"projectId"));
 const supabase=actor.supabase;const organizationId=portal?actor.client.organization_id:actor.organizationId;
 const buffer=Buffer.from(await file.arrayBuffer());const sha256=createHash("sha256").update(buffer).digest("hex");
 const storagePath=`${organizationId}/${ticketId}/${randomUUID()}-${cleanFileName(file.name)}`;const admin=createSupabaseAdminClient();
 const{error:uploadError}=await admin.storage.from("crm-sac-attachments").upload(storagePath,buffer,{contentType:file.type,upsert:false});
 if(uploadError)fail(path,uploadError.message);
 const{error}=await supabase.rpc("register_sac_ticket_attachment",{p_ticket_id:ticketId,p_message_id:optional(data,"messageId"),p_storage_path:storagePath,p_file_name:file.name,p_mime_type:file.type,p_size_bytes:file.size,p_sha256:sha256,p_client_visible:portal?true:boolean(data,"clientVisible")});
 if(error){await admin.storage.from("crm-sac-attachments").remove([storagePath]);fail(path,error.message);}
 revalidatePath(path);
}

export async function uploadSacTicketAttachment(data:FormData){return uploadSacAttachment(data,false);}
export async function uploadClientSacTicketAttachment(data:FormData){return uploadSacAttachment(data,true);}
