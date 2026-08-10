"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/authorization";
import { requireClientContext, requireUser } from "@/lib/auth";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { fileSecurityMessage } from "@/lib/file-security/domain";
import { secureUpload } from "@/lib/file-security/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { evaluateQualityResponse, parseQualityFormSchema, type QualityAnswerMap, type QualityFormSchema } from "@/lib/quality/forms";
import { safeFileName, sha256 } from "@/lib/signatures/crypto";

const MAX_DOCUMENT_SIZE=50*1024*1024;
const MAX_ATTACHMENT_SIZE=20*1024*1024;
const DOCUMENT_MIMES=new Set([
  "application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","image/png","image/jpeg","image/webp"
]);
const ATTACHMENT_MIMES=new Set([
  "application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png","image/jpeg","image/webp","image/heic"
]);
type ProviderLikeError={code?:string|null;statusCode?:string|number|null;name?:string|null};

function text(formData:FormData,key:string){return String(formData.get(key)??"").trim();}
function optional(formData:FormData,key:string){const value=text(formData,key);return value||null;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}
function failData(path:string,operation:string,error:ProviderLikeError|null|undefined,message:string):never{reportDataAccessError(`quality.${operation}`,error);fail(path,message);}
function throwData(operation:string,error:ProviderLikeError|null|undefined,message:string):never{reportDataAccessError(`quality.${operation}`,error);throw new Error(message);}

export async function uploadQualityDocument(formData:FormData){
  const projectId=optional(formData,"projectId");
  const context=await requireCapability("qualidade","create",projectId);
  const file=formData.get("file");const title=text(formData,"title");
  if(!(file instanceof File)||!title)fail("/app/qualidade/documentos","Informe título e arquivo.");
  if(file.size<=0||file.size>MAX_DOCUMENT_SIZE)fail("/app/qualidade/documentos","O arquivo deve possuir até 50 MB.");
  if(!DOCUMENT_MIMES.has(file.type))fail("/app/qualidade/documentos","Formato de arquivo não permitido.");
  const bytes=new Uint8Array(await file.arrayBuffer());const digest=sha256(bytes);
  const logicalId=optional(formData,"logicalId")??randomUUID();
  const admin=createSupabaseAdminClient();
  const{data:last,error:lastError}=await admin.from("quality_documents").select("version_number").eq("logical_id",logicalId).order("version_number",{ascending:false}).limit(1).maybeSingle();
  if(lastError)failData("/app/qualidade/documentos","load-document-version",lastError,"Não foi possível preparar a nova versão do documento.");
  const version=Number(last?.version_number??0)+1;
  const path=`${context.organizationId}/library/${logicalId}/v${version}/${randomUUID()}-${safeFileName(file.name)}`;
  try{
    await secureUpload({
      targetBucket:"quality-documents",targetPath:path,body:bytes,
      filename:file.name,contentType:file.type,
      organizationId:context.organizationId,actorUserId:context.userId,
      policy:{allowedMimeTypes:DOCUMENT_MIMES,maxBytes:MAX_DOCUMENT_SIZE}
    });
  }catch(uploadError){fail("/app/qualidade/documentos",fileSecurityMessage(uploadError,{maxBytesLabel:"50 MB",allowedLabel:"PDF, DOCX, XLSX, JPG, PNG ou WebP"}));}
  if(version>1){
    const{error:currentError}=await admin.from("quality_documents").update({is_current:false}).eq("logical_id",logicalId);
    if(currentError){
      reportDataAccessError("quality.mark-previous-document",currentError);
      const{error:cleanupError}=await admin.storage.from("quality-documents").remove([path]);reportDataAccessError("quality.cleanup-document-upload",cleanupError);
      fail("/app/qualidade/documentos","Não foi possível preparar a nova versão do documento.");
    }
  }
  const{error}=await context.supabase.from("quality_documents").insert({
    organization_id:context.organizationId,project_id:projectId,client_id:optional(formData,"clientId"),logical_id:logicalId,
    version_number:version,kind:text(formData,"kind")||"OTHER",title,description:text(formData,"description"),
    file_name:file.name,mime_type:file.type,size_bytes:file.size,storage_path:path,sha256:digest,
    client_visible:formData.get("clientVisible")!==null,uploaded_by:context.userId
  });
  if(error){
    reportDataAccessError("quality.insert-document",error);
    const{error:cleanupError}=await context.supabase.storage.from("quality-documents").remove([path]);reportDataAccessError("quality.cleanup-document",cleanupError);
    fail("/app/qualidade/documentos","Não foi possível registrar o documento.");
  }
  revalidatePath("/app/qualidade");revalidatePath("/app/qualidade/documentos");revalidatePath("/cliente/documentos");
}

export async function createQualityTemplate(formData:FormData){
  const context=await requireCapability("qualidade","create");
  let schema:QualityFormSchema;
  try{schema=parseQualityFormSchema(JSON.parse(text(formData,"schemaJson")));}
  catch(validationError){fail("/app/qualidade/formularios/novo",validationError instanceof Error?validationError.message:"Schema inválido.");}
  const code=text(formData,"code").toUpperCase().replace(/[^A-Z0-9_-]+/g,"-");
  const title=text(formData,"title");if(!code||!title)fail("/app/qualidade/formularios/novo","Informe código e título.");
  const{data:template,error}=await context.supabase.from("quality_form_templates").insert({
    organization_id:context.organizationId,code,title,description:text(formData,"description"),kind:schema.kind,
    scope:text(formData,"scope")||"INTERNAL",status:"DRAFT",allow_attachments:true,allow_photos:true,created_by:context.userId
  }).select("id").single();
  if(error||!template)failData("/app/qualidade/formularios/novo","create-template",error,"Não foi possível criar o modelo.");
  const{data:version,error:versionError}=await context.supabase.from("quality_form_versions").insert({
    organization_id:context.organizationId,template_id:template.id,version_number:1,schema_json:schema,
    presentation_json:{theme:"alpine",showProgress:true},change_summary:"Versão inicial",created_by:context.userId
  }).select("id").single();
  if(versionError||!version){
    reportDataAccessError("quality.create-template-version",versionError);
    const{error:cleanupError}=await context.supabase.from("quality_form_templates").delete().eq("id",template.id);reportDataAccessError("quality.cleanup-template",cleanupError);
    fail("/app/qualidade/formularios/novo","Não foi possível criar a versão inicial do modelo.");
  }
  const{error:pointerError}=await context.supabase.from("quality_form_templates").update({current_version_id:version.id}).eq("id",template.id);
  if(pointerError)failData("/app/qualidade/formularios/novo","link-template-version",pointerError,"Não foi possível ativar a versão inicial do modelo.");
  redirect(`/app/qualidade/formularios/${template.id}`);
}

export async function createQualityTemplateVersion(formData:FormData){
  const templateId=text(formData,"templateId");const context=await requireCapability("qualidade","update");
  let schema:QualityFormSchema;
  try{schema=parseQualityFormSchema(JSON.parse(text(formData,"schemaJson")));}
  catch(validationError){fail(`/app/qualidade/formularios/${templateId}`,validationError instanceof Error?validationError.message:"Schema inválido.");}
  const admin=createSupabaseAdminClient();
  const{data:last,error:lastError}=await admin.from("quality_form_versions").select("version_number").eq("template_id",templateId).order("version_number",{ascending:false}).limit(1).single();
  if(lastError)failData(`/app/qualidade/formularios/${templateId}`,"load-template-version",lastError,"Não foi possível determinar a versão atual.");
  const{data,error}=await context.supabase.from("quality_form_versions").insert({
    organization_id:context.organizationId,template_id:templateId,version_number:Number(last?.version_number??0)+1,
    schema_json:schema,presentation_json:{theme:"alpine",showProgress:true},change_summary:text(formData,"changeSummary"),created_by:context.userId
  }).select("id").single();
  if(error||!data)failData(`/app/qualidade/formularios/${templateId}`,"create-template-version",error,"Não foi possível criar a versão.");
  const{error:pointerError}=await context.supabase.from("quality_form_templates").update({current_version_id:data.id,status:"DRAFT",updated_at:new Date().toISOString()}).eq("id",templateId);
  if(pointerError)failData(`/app/qualidade/formularios/${templateId}`,"link-template-version",pointerError,"A versão foi criada, mas não pôde ser ativada.");
  revalidatePath(`/app/qualidade/formularios/${templateId}`);
}

export async function publishQualityTemplate(formData:FormData){
  const templateId=text(formData,"templateId");const context=await requireCapability("qualidade","approve");
  const{error}=await context.supabase.rpc("publish_quality_form_version",{p_version_id:text(formData,"versionId")});
  if(error)failData(`/app/qualidade/formularios/${templateId}`,"publish-template",error,"Não foi possível publicar o formulário.");
  revalidatePath("/app/qualidade/formularios");revalidatePath(`/app/qualidade/formularios/${templateId}`);
}

export async function createQualityAssignment(formData:FormData){
  const templateId=text(formData,"templateId");const projectId=optional(formData,"projectId");
  const context=await requireCapability("qualidade","assign_users",projectId);
  const admin=createSupabaseAdminClient();
  const{data:template,error:templateError}=await admin.from("quality_form_templates").select("id,current_version_id,title,scope").eq("id",templateId).single();
  if(templateError){reportDataAccessError("quality.load-assignment-template",templateError);fail(`/app/qualidade/formularios/${templateId}`,"Não foi possível carregar o modelo para distribuição.");}
  if(!template?.current_version_id)fail(`/app/qualidade/formularios/${templateId}`,"Publique uma versão antes de distribuir.");
  const{data:assignment,error}=await context.supabase.from("quality_form_assignments").insert({
    organization_id:context.organizationId,template_version_id:template.current_version_id,project_id:projectId,
    client_id:optional(formData,"clientId"),assignee_user_id:optional(formData,"assigneeUserId"),
    title:text(formData,"assignmentTitle")||template.title,instructions:text(formData,"instructions"),status:"OPEN",
    due_at:optional(formData,"dueAt"),max_responses:Number(text(formData,"maxResponses")||1),created_by:context.userId
  }).select("id").single();
  if(error||!assignment)failData(`/app/qualidade/formularios/${templateId}`,"create-assignment",error,"Não foi possível distribuir o formulário.");
  const token=randomBytes(32).toString("base64url");
  const{error:linkError}=await context.supabase.from("quality_public_links").insert({
    organization_id:context.organizationId,assignment_id:assignment.id,token_sha256:sha256(token),
    expires_at:optional(formData,"expiresAt"),created_by:context.userId
  });
  if(linkError){
    reportDataAccessError("quality.create-public-link",linkError);
    const{error:cleanupError}=await context.supabase.from("quality_form_assignments").delete().eq("id",assignment.id);reportDataAccessError("quality.cleanup-assignment",cleanupError);
    fail(`/app/qualidade/formularios/${templateId}`,"Não foi possível gerar o link público do formulário.");
  }
  const baseUrl=process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000";
  redirect(`/app/qualidade/formularios/${templateId}?assignment=${assignment.id}&share=${encodeURIComponent(`${baseUrl}/formularios/${token}`)}`);
}

function extractAnswers(schema:QualityFormSchema,formData:FormData){
  const answers:QualityAnswerMap={};const files=new Map<string,File>();
  for(const field of schema.fields){
    if(field.type==="CHECKLIST"){
      const value:Record<string,string>={};for(const item of field.items??[])value[item.key]=text(formData,`field__${field.key}__${item.key}`);
      answers[field.key]=value;
    }else if(field.type==="CHECKBOX")answers[field.key]=formData.get(`field__${field.key}`)!==null;
    else if(field.type==="YES_NO")answers[field.key]=text(formData,`field__${field.key}`)==="true";
    else if(field.type==="FILE"||field.type==="PHOTO"){
      const file=formData.get(`file__${field.key}`);if(file instanceof File&&file.size>0){answers[field.key]=file.name;files.set(field.key,file);}else answers[field.key]=null;
    }else answers[field.key]=text(formData,`field__${field.key}`);
  }
  return{answers,files};
}

async function persistQualityResponse(input:{assignmentId:string;respondentUserId?:string|null;respondentName?:string|null;respondentEmail?:string|null;formData:FormData}){
  const admin=createSupabaseAdminClient();
  const{data:assignment,error}=await admin.from("quality_form_assignments").select("*").eq("id",input.assignmentId).single();
  if(error)throwData("load-assignment",error,"Formulário não encontrado.");
  if(!assignment)throw new Error("Formulário não encontrado.");
  if(assignment.status!=="OPEN"&&assignment.status!=="PENDING")throw new Error("Este formulário não está aberto.");
  if(assignment.due_at&&new Date(assignment.due_at).getTime()<Date.now())throw new Error("O prazo deste formulário expirou.");
  if(assignment.responses_count>=assignment.max_responses)throw new Error("O limite de respostas foi atingido.");
  const{data:version,error:versionError}=await admin.from("quality_form_versions").select("schema_json").eq("id",assignment.template_version_id).single();
  if(versionError)throwData("load-response-version",versionError,"Versão do formulário indisponível.");
  if(!version)throw new Error("Versão do formulário indisponível.");
  const schema=parseQualityFormSchema(version.schema_json);const{answers,files}=extractAnswers(schema,input.formData);
  const evaluation=evaluateQualityResponse(schema,answers);if(!evaluation.valid)throw new Error(evaluation.errors[0]);
  for(const file of files.values()){
    if(file.size>MAX_ATTACHMENT_SIZE)throw new Error("Cada anexo deve possuir até 20 MB.");
    if(!ATTACHMENT_MIMES.has(file.type))throw new Error("Formato de anexo não permitido.");
  }
  const responseId=randomUUID();
  const{error:responseError}=await admin.from("quality_form_responses").insert({
    id:responseId,organization_id:assignment.organization_id,assignment_id:assignment.id,template_version_id:assignment.template_version_id,
    project_id:assignment.project_id,client_id:assignment.client_id,respondent_user_id:input.respondentUserId??null,
    respondent_name:input.respondentName??null,respondent_email:input.respondentEmail??null,status:"DRAFT"
  });
  if(responseError)throwData("create-response",responseError,"Não foi possível iniciar a resposta do formulário.");
  const uploaded:string[]=[];const rows=[];
  try{
    for(const field of schema.fields){
      const file=files.get(field.key);let fileData:Record<string,unknown>={};
      if(file){const bytes=new Uint8Array(await file.arrayBuffer());const path=`${assignment.organization_id}/responses/${responseId}/${field.key}/${randomUUID()}-${safeFileName(file.name)}`;
        try{
          await secureUpload({
            targetBucket:"quality-form-attachments",targetPath:path,body:bytes,
            filename:file.name,contentType:file.type,
            organizationId:assignment.organization_id,actorUserId:input.respondentUserId??responseId,
            correlationId:responseId,
            policy:{allowedMimeTypes:ATTACHMENT_MIMES,maxBytes:MAX_ATTACHMENT_SIZE,requireContentSignature:false}
          });
        }catch(uploadError){throw new Error(fileSecurityMessage(uploadError,{maxBytesLabel:"20 MB",allowedLabel:"PDF, DOCX, JPG, PNG, WebP ou HEIC"}));}
        uploaded.push(path);fileData={file_name:file.name,file_mime_type:file.type,file_size_bytes:file.size,file_storage_path:path,file_sha256:sha256(bytes)};}
      rows.push({organization_id:assignment.organization_id,response_id:responseId,field_key:field.key,value_json:files.has(field.key)?null:answers[field.key],...fileData});
    }
    const{error:answersError}=await admin.from("quality_form_answers").insert(rows);
    if(answersError)throwData("save-response-answers",answersError,"Não foi possível salvar as respostas do formulário.");
    const{error:submitError}=await admin.rpc("mark_quality_response_submitted",{p_response_id:responseId,p_score:evaluation.score,p_result:evaluation.result});
    if(submitError)throwData("submit-response",submitError,"Não foi possível concluir a resposta do formulário.");
  }catch(responseFailure){
    if(uploaded.length){const{error:artifactCleanupError}=await admin.storage.from("quality-form-attachments").remove(uploaded);reportDataAccessError("quality.cleanup-response-artifacts",artifactCleanupError);}
    const{error:responseCleanupError}=await admin.from("quality_form_responses").delete().eq("id",responseId);reportDataAccessError("quality.cleanup-response",responseCleanupError);
    throw responseFailure;
  }
  return responseId;
}

export async function submitPublicQualityForm(formData:FormData){
  const token=text(formData,"token");const path=`/formularios/${encodeURIComponent(token)}`;if(!token)fail(path,"Link inválido.");
  const admin=createSupabaseAdminClient();const tokenHash=sha256(token);
  const{data:link,error}=await admin.from("quality_public_links").select("*").eq("token_sha256",tokenHash).single();
  if(error)reportDataAccessError("quality.public-load-link",error);
  if(error||!link||link.revoked_at||(link.expires_at&&new Date(link.expires_at).getTime()<Date.now()))fail(path,"Link expirado ou revogado.");
  try{await persistQualityResponse({assignmentId:link.assignment_id,respondentName:text(formData,"respondentName")||null,respondentEmail:text(formData,"respondentEmail")||null,formData});}
  catch(responseFailure){fail(path,responseFailure instanceof Error?responseFailure.message:"Não foi possível enviar a resposta.");}
  const{error:accessError}=await admin.rpc("register_quality_public_link_access",{p_token_sha256:tokenHash});reportDataAccessError("quality.public-register-access",accessError);
  redirect(`${path}?submitted=1`);
}

export async function submitClientQualityForm(formData:FormData){
  const assignmentId=text(formData,"assignmentId");const{user,client}=await requireClientContext();
  const admin=createSupabaseAdminClient();const{data:assignment,error:assignmentError}=await admin.from("quality_form_assignments").select("client_id,project_id").eq("id",assignmentId).single();
  if(assignmentError)reportDataAccessError("quality.client-load-assignment",assignmentError);
  if(assignmentError||!assignment||assignment.client_id!==client.id)fail(`/cliente/formularios/${assignmentId}`,"Formulário não autorizado.");
  try{await persistQualityResponse({assignmentId,respondentUserId:user.id,respondentName:client.legal_name??client.trade_name,respondentEmail:user.email,formData});}
  catch(responseFailure){fail(`/cliente/formularios/${assignmentId}`,responseFailure instanceof Error?responseFailure.message:"Não foi possível enviar a resposta.");}
  redirect(`/cliente/formularios/${assignmentId}?submitted=1`);
}

export async function submitInternalQualityForm(formData:FormData){
  const assignmentId=text(formData,"assignmentId");const{user}=await requireUser();const admin=createSupabaseAdminClient();
  const{data:assignment,error:assignmentError}=await admin.from("quality_form_assignments").select("project_id").eq("id",assignmentId).single();
  if(assignmentError)failData(`/app/qualidade/preenchimentos/${assignmentId}`,"internal-load-assignment",assignmentError,"Não foi possível carregar o formulário.");
  await requireCapability("qualidade","create",assignment?.project_id??null);
  try{await persistQualityResponse({assignmentId,respondentUserId:user.id,respondentName:user.user_metadata?.full_name??user.email,respondentEmail:user.email,formData});}
  catch(responseFailure){fail(`/app/qualidade/preenchimentos/${assignmentId}`,responseFailure instanceof Error?responseFailure.message:"Não foi possível enviar a resposta.");}
  redirect(`/app/qualidade/preenchimentos/${assignmentId}?submitted=1`);
}

export async function reviewQualityResponse(formData:FormData){
  const responseId=text(formData,"responseId");const assignmentId=text(formData,"assignmentId");
  const admin=createSupabaseAdminClient();const{data:response,error:responseError}=await admin.from("quality_form_responses").select("project_id").eq("id",responseId).single();
  if(responseError)failData(`/app/qualidade/preenchimentos/${assignmentId}`,"load-review-response",responseError,"Não foi possível carregar a resposta para revisão.");
  const context=await requireCapability("qualidade","approve",response?.project_id??null);
  const{error}=await context.supabase.rpc("review_quality_response",{p_response_id:responseId,p_decision:text(formData,"decision"),p_comment:text(formData,"comment")||null});
  if(error)failData(`/app/qualidade/preenchimentos/${assignmentId}`,"review-response",error,"Não foi possível registrar a revisão.");
  revalidatePath(`/app/qualidade/preenchimentos/${assignmentId}`);revalidatePath("/app/qualidade");
}