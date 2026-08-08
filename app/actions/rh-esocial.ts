"use server";

import{redirect}from"next/navigation";
import{requireCapability}from"@/lib/authorization";
import{
  assertSignedEsocialEvent,buildEsocialBatchXml,extractEsocialProtocol,extractEsocialResponseStatus,
  queryEsocialBatch,sendEsocialBatch,sha256,type EsocialEnvironment,type EsocialHttpResult
}from"@/lib/rh/integrations/esocial-transport";

const BASE="/app/rh/obrigacoes/esocial";
function text(d:FormData,k:string){return String(d.get(k)??"").trim();}
function fail(path:string,msg:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(msg)}`);}
function success(path:string,msg:string):never{redirect(`${path}${path.includes("?")?"&":"?"}success=${encodeURIComponent(msg)}`);}
function env(value:string):EsocialEnvironment{return value==="PRODUCTION"?"PRODUCTION":"RESTRICTED";}

export async function saveSignedEsocialEvent(data:FormData){
 const context=await requireCapability("rh","update");const path=`${BASE}/novo`;
 const signedXml=text(data,"signedXml");let parsed:{id:string;payloadSha256:string;normalizedXml:string};
 try{parsed=assertSignedEsocialEvent(signedXml);}catch(error){fail(path,error instanceof Error?error.message:"XML assinado inválido.");}
 const eventKey=text(data,"eventKey")||parsed.id;
 if(eventKey!==parsed.id)fail(path,"A chave informada não coincide com o atributo Id do XML assinado.");
 const environment=env(text(data,"environment"));
 if(environment==="PRODUCTION"&&process.env.ESOCIAL_ENABLE_PRODUCTION!=="true")fail(path,"Produção está bloqueada. Use Produção Restrita até a homologação formal.");
 const{data:event,error}=await context.supabase.from("rh_esocial_events").insert({
  organization_id:context.organizationId,event_type:text(data,"eventType").toUpperCase(),event_key:eventKey,event_group:Number(text(data,"eventGroup")),operation:text(data,"operation")||"INCLUDE",environment,
  employer_registration_type:Number(text(data,"employerRegistrationType")),employer_registration_number:text(data,"employerRegistrationNumber").replace(/\D/g,""),
  transmitter_registration_type:Number(text(data,"transmitterRegistrationType")),transmitter_registration_number:text(data,"transmitterRegistrationNumber").replace(/\D/g,""),
  layout_version:text(data,"layoutVersion"),source_type:text(data,"sourceType")||"MANUAL_SIGNED_XML",source_id:null,signed_xml:parsed.normalizedXml,payload_sha256:parsed.payloadSha256,status:"SIGNED",created_by:context.userId
 }).select("id").single();
 if(error)fail(path,error.message);redirect(`${BASE}/eventos/${event.id}`);
}

export async function createEsocialBatch(data:FormData){
 const context=await requireCapability("rh","update");const eventIds=data.getAll("eventIds").map(String).filter(Boolean);
 if(!eventIds.length)fail(BASE,"Selecione ao menos um evento assinado.");
 const{data:batchId,error}=await context.supabase.rpc("create_rh_esocial_batch",{p_organization_id:context.organizationId,p_event_ids:eventIds});
 if(error)fail(BASE,error.message);redirect(`${BASE}/lotes/${batchId}`);
}

async function nextAttempt(context:Awaited<ReturnType<typeof requireCapability>>,batchId:string,operation:"SEND_BATCH"|"QUERY_BATCH"){
 const{data}=await context.supabase.from("rh_esocial_attempts").select("attempt_number").eq("batch_id",batchId).eq("operation",operation).order("attempt_number",{ascending:false}).limit(1).maybeSingle();
 return Number(data?.attempt_number??0)+1;
}

async function markTransportFailure(context:Awaited<ReturnType<typeof requireCapability>>,attemptId:string,batchId:string,message:string){
 const unknown=/timeout|indetermin/i.test(message);
 await context.supabase.from("rh_esocial_attempts").update({result:unknown?"UNKNOWN":"TECHNICAL_ERROR",error_message:message,completed_at:new Date().toISOString()}).eq("id",attemptId);
 await context.supabase.from("rh_esocial_batches").update({status:unknown?"UNKNOWN":"READY",updated_at:new Date().toISOString()}).eq("id",batchId);
 return message;
}

export async function sendEsocialBatchAction(data:FormData){
 const context=await requireCapability("rh","approve");const batchId=text(data,"batchId"),path=`${BASE}/lotes/${batchId}`;
 const{data:batch,error:bError}=await context.supabase.from("rh_esocial_batches").select("id,organization_id,environment,event_group,employer_registration_type,employer_registration_number,transmitter_registration_type,transmitter_registration_number,communication_namespace_version,status,rh_esocial_batch_events(position,rh_esocial_events(id,event_key,signed_xml,status))").eq("organization_id",context.organizationId).eq("id",batchId).maybeSingle();
 if(bError)fail(path,bError.message);if(!batch)fail(path,"Lote não encontrado.");
 if(!["READY","UNKNOWN"].includes(batch.status))fail(path,`Lote em estado ${batch.status} não permite envio.`);
 const relations=Array.isArray(batch.rh_esocial_batch_events)?batch.rh_esocial_batch_events:[];
 const events=relations.sort((a,b)=>a.position-b.position).map(rel=>{const event=Array.isArray(rel.rh_esocial_events)?rel.rh_esocial_events[0]:rel.rh_esocial_events;if(!event)throw new Error("Evento do lote não encontrado.");return{id:event.event_key,signedXml:event.signed_xml};});
 let batchXml:string;
 try{batchXml=buildEsocialBatchXml({group:batch.event_group as 1|2|3,employerType:batch.employer_registration_type as 1|2,employerNumber:batch.employer_registration_number,transmitterType:batch.transmitter_registration_type as 1|2,transmitterNumber:batch.transmitter_registration_number,events,namespaceVersion:batch.communication_namespace_version});}catch(error){fail(path,error instanceof Error?error.message:"Falha ao montar o lote.");}
 const attemptNumber=await nextAttempt(context,batchId,"SEND_BATCH");
 const{data:attempt,error:aError}=await context.supabase.from("rh_esocial_attempts").insert({organization_id:context.organizationId,batch_id:batchId,operation:"SEND_BATCH",attempt_number:attemptNumber,endpoint_url:"OFFICIAL_ESOCIAL_SEND",soap_action:process.env.ESOCIAL_SEND_SOAP_ACTION??"default-package-v1.6",request_sha256:sha256(batchXml),result:"STARTED",created_by:context.userId}).select("id").single();
 if(aError)fail(path,aError.message);
 await context.supabase.from("rh_esocial_batches").update({status:"SENDING",updated_at:new Date().toISOString()}).eq("id",batchId).eq("organization_id",context.organizationId);

 let result:EsocialHttpResult;
 try{result=await sendEsocialBatch(env(batch.environment),batchXml);}catch(error){
  const message=await markTransportFailure(context,attempt.id,batchId,error instanceof Error?error.message:"Erro técnico no envio ao eSocial.");
  fail(path,message);
 }
 const protocol=extractEsocialProtocol(result.responseXml);const status=extractEsocialResponseStatus(result.responseXml);
 if(protocol&&result.httpStatus>=200&&result.httpStatus<300){
  const{error:attemptError}=await context.supabase.from("rh_esocial_attempts").update({endpoint_url:result.endpoint,soap_action:result.soapAction,http_status:result.httpStatus,result:"SUCCESS",response_xml:result.responseXml,response_sha256:result.responseSha256,duration_ms:result.durationMs,completed_at:new Date().toISOString()}).eq("id",attempt.id);
  if(attemptError)fail(path,`O eSocial recebeu o lote, mas falhou o registro local da tentativa: ${attemptError.message}`);
  const{error:protocolError}=await context.supabase.rpc("mark_rh_esocial_batch_protocol",{p_batch_id:batchId,p_protocol_number:protocol,p_response_code:status.code,p_response_description:status.description});
  if(protocolError)fail(path,`O eSocial retornou protocolo ${protocol}, mas falhou sua persistência local: ${protocolError.message}`);
  success(path,`Lote recebido pelo eSocial. Protocolo ${protocol}.`);
 }

 await context.supabase.from("rh_esocial_attempts").update({endpoint_url:result.endpoint,soap_action:result.soapAction,http_status:result.httpStatus,result:result.httpStatus>=200&&result.httpStatus<300?"BUSINESS_REJECTION":"TECHNICAL_ERROR",response_xml:result.responseXml,response_sha256:result.responseSha256,error_code:status.code,error_message:status.description,duration_ms:result.durationMs,completed_at:new Date().toISOString()}).eq("id",attempt.id);
 await context.supabase.from("rh_esocial_batches").update({status:"REJECTED",response_code:status.code,response_description:status.description,updated_at:new Date().toISOString()}).eq("id",batchId);
 const eventIds=relations.map(r=>{const e=Array.isArray(r.rh_esocial_events)?r.rh_esocial_events[0]:r.rh_esocial_events;return e?.id??"";}).filter(Boolean);
 if(eventIds.length)await context.supabase.from("rh_esocial_events").update({status:"REJECTED",response_code:status.code,response_description:status.description,updated_at:new Date().toISOString()}).in("id",eventIds);
 fail(path,status.description??`Envio recusado (HTTP ${result.httpStatus}).`);
}

export async function queryEsocialBatchAction(data:FormData){
 const context=await requireCapability("rh","update");const batchId=text(data,"batchId"),path=`${BASE}/lotes/${batchId}`;
 const{data:batch,error}=await context.supabase.from("rh_esocial_batches").select("id,environment,protocol_number,status").eq("organization_id",context.organizationId).eq("id",batchId).maybeSingle();if(error)fail(path,error.message);if(!batch?.protocol_number)fail(path,"O lote ainda não possui protocolo para consulta.");
 const attemptNumber=await nextAttempt(context,batchId,"QUERY_BATCH");
 const{data:attempt,error:aError}=await context.supabase.from("rh_esocial_attempts").insert({organization_id:context.organizationId,batch_id:batchId,operation:"QUERY_BATCH",attempt_number:attemptNumber,endpoint_url:"OFFICIAL_ESOCIAL_QUERY",soap_action:process.env.ESOCIAL_QUERY_SOAP_ACTION??"default-package-v1.6",request_sha256:sha256(batch.protocol_number),result:"STARTED",created_by:context.userId}).select("id").single();if(aError)fail(path,aError.message);

 let result:EsocialHttpResult;
 try{result=await queryEsocialBatch(env(batch.environment),batch.protocol_number);}catch(error){
  const message=error instanceof Error?error.message:"Erro ao consultar lote eSocial.";const unknown=/timeout|indetermin/i.test(message);
  await context.supabase.from("rh_esocial_attempts").update({result:unknown?"UNKNOWN":"TECHNICAL_ERROR",error_message:message,completed_at:new Date().toISOString()}).eq("id",attempt.id);
  fail(path,message);
 }
 const status=extractEsocialResponseStatus(result.responseXml);
 await context.supabase.from("rh_esocial_attempts").update({endpoint_url:result.endpoint,soap_action:result.soapAction,http_status:result.httpStatus,result:result.httpStatus>=200&&result.httpStatus<300?"SUCCESS":"TECHNICAL_ERROR",response_xml:result.responseXml,response_sha256:result.responseSha256,duration_ms:result.durationMs,completed_at:new Date().toISOString()}).eq("id",attempt.id);
 const nextStatus=status.code==="101"?"PROCESSING":status.code==="201"?"COMPLETED":"REJECTED";
 await context.supabase.from("rh_esocial_batches").update({status:nextStatus,response_code:status.code,response_description:status.description,estimated_completion_seconds:status.estimatedSeconds,completed_at:nextStatus==="COMPLETED"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",batchId);
 success(path,status.description??`Consulta concluída com código ${status.code??"sem código"}.`);
}
