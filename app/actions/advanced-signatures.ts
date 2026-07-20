"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireCapability } from "@/lib/authorization";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSigningToken, hashCanonical, safeFileName, sha256 } from "@/lib/signatures/crypto";

const PDF_MIME="application/pdf";
const DOCX_MIME="application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_DOCUMENT_SIZE=50*1024*1024;

function text(formData:FormData,key:string){return String(formData.get(key)??"").trim();}
function optional(formData:FormData,key:string){const value=text(formData,key);return value||null;}
function numberValue(formData:FormData,key:string){const parsed=Number(text(formData,key).replace(",","."));return Number.isFinite(parsed)?parsed:null;}
function fail(path:string,message:string):never{redirect(`${path}${path.includes("?")?"&":"?"}error=${encodeURIComponent(message)}`);}

export async function createAdvancedSignatureDocument(formData:FormData){
  const context=await requireCapability("assinaturas","create",optional(formData,"projectId"));
  const file=formData.get("file");
  const title=text(formData,"title");
  const clientId=optional(formData,"clientId");
  const projectId=optional(formData,"projectId");
  if(!(file instanceof File)||!title)fail("/app/assinaturas/novo","Informe título e arquivo.");
  if(file.size<=0||file.size>MAX_DOCUMENT_SIZE)fail("/app/assinaturas/novo","O arquivo deve possuir até 50 MB.");
  if(![PDF_MIME,DOCX_MIME].includes(file.type))fail("/app/assinaturas/novo","Envie um arquivo PDF ou DOCX válido.");

  const bytes=new Uint8Array(await file.arrayBuffer());
  const originalSha=sha256(bytes);
  const sourceFormat=file.type===PDF_MIME?"PDF":"DOCX";
  let pageCount:number|null=null;
  if(sourceFormat==="PDF"){
    try{pageCount=(await PDFDocument.load(bytes,{ignoreEncryption:false})).getPageCount();}
    catch{fail("/app/assinaturas/novo","O PDF está corrompido, criptografado ou não pode ser processado.");}
  }

  const requestId=randomUUID();
  const fileName=safeFileName(file.name);
  const originalPath=`${context.organizationId}/documents/${requestId}/original/${fileName}`;
  const{error:uploadError}=await context.supabase.storage.from("signature-artifacts").upload(originalPath,bytes,{contentType:file.type,upsert:false});
  if(uploadError)fail("/app/assinaturas/novo",uploadError.message);

  const{data,error}=await context.supabase.rpc("create_advanced_signature_document",{
    p_organization_id:context.organizationId,
    p_client_id:clientId,
    p_project_id:projectId,
    p_title:title,
    p_category:text(formData,"category")||"OUTRO",
    p_source_format:sourceFormat,
    p_original_storage_path:originalPath,
    p_original_file_name:file.name,
    p_original_mime_type:file.type,
    p_original_size_bytes:file.size,
    p_original_sha256:originalSha,
    p_rendered_pdf_path:sourceFormat==="PDF"?originalPath:null,
    p_rendered_pdf_sha256:sourceFormat==="PDF"?originalSha:null,
    p_page_count:pageCount
  });
  if(error||!data){await context.supabase.storage.from("signature-artifacts").remove([originalPath]);fail("/app/assinaturas/novo",error?.message??"Não foi possível criar o documento.");}
  redirect(`/app/assinaturas/documentos/${data}`);
}

export async function createAdvancedEnvelope(formData:FormData){
  const documentId=text(formData,"documentId");
  const versionId=text(formData,"versionId");
  const context=await requireCapability("assinaturas","sign",optional(formData,"projectId"));
  const signers:Array<Record<string,unknown>>=[];
  const links:Array<{name:string;email:string;url:string}>=[];
  const baseUrl=process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000";

  for(let index=1;index<=4;index++){
    const name=text(formData,`signerName${index}`);
    const email=text(formData,`signerEmail${index}`).toLowerCase();
    if(!name&&!email)continue;
    if(!name||!email)fail(`/app/assinaturas/documentos/${documentId}`,`Complete nome e e-mail do signatário ${index}.`);
    const{token,tokenSha256}=createSigningToken();
    const expiration=new Date(Date.now()+7*24*60*60*1000).toISOString();
    signers.push({
      name,
      legal_name:text(formData,`signerLegalName${index}`)||name,
      email,
      initials:optional(formData,`signerInitials${index}`),
      role_label:optional(formData,`signerRole${index}`),
      signing_order:index,
      token_sha256:tokenSha256,
      expires_at:expiration,
      authentication_method:"EMAIL_LINK"
    });
    links.push({name,email,url:`${baseUrl}/assinar/${token}`});
  }
  if(!signers.length)fail(`/app/assinaturas/documentos/${documentId}`,"Informe ao menos um signatário.");

  const{data,error}=await context.supabase.rpc("create_advanced_signature_envelope",{
    p_document_version_id:versionId,
    p_provider:text(formData,"provider")||"SANDBOX",
    p_idempotency_key:randomUUID(),
    p_signers:signers
  });
  if(error||!data)fail(`/app/assinaturas/documentos/${documentId}`,error?.message??"Não foi possível criar o envelope.");

  const cookieStore=await cookies();
  cookieStore.set(`signature-links-${data}`,JSON.stringify(links),{
    httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",maxAge:600,path:`/app/assinaturas/documentos/${documentId}`
  });
  revalidatePath(`/app/assinaturas/documentos/${documentId}`);
  redirect(`/app/assinaturas/documentos/${documentId}?envelope=${data}&links=1`);
}

export async function addAdvancedSignatureField(formData:FormData){
  const documentId=text(formData,"documentId");
  const projectId=optional(formData,"projectId");
  const context=await requireCapability("assinaturas","update",projectId);
  const envelopeId=text(formData,"envelopeId");
  const fieldType=text(formData,"fieldType");
  const page=numberValue(formData,"pageNumber");
  const x=numberValue(formData,"xPercent");
  const y=numberValue(formData,"yPercent");
  const width=numberValue(formData,"widthPercent");
  const height=numberValue(formData,"heightPercent");
  if(!envelopeId||!fieldType||!page||x===null||y===null||width===null||height===null){
    fail(`/app/assinaturas/documentos/${documentId}`,"Informe tipo, página, posição e dimensões do campo.");
  }
  const{error}=await context.supabase.rpc("add_advanced_signature_field",{
    p_envelope_id:envelopeId,
    p_signer_id:optional(formData,"signerId"),
    p_field_type:fieldType,
    p_page_number:page,
    p_x_ratio:x/100,
    p_y_ratio:y/100,
    p_width_ratio:width/100,
    p_height_ratio:height/100,
    p_label:optional(formData,"label"),
    p_placeholder:optional(formData,"placeholder"),
    p_required:formData.get("required")!==null,
    p_signing_order:numberValue(formData,"signingOrder")??1,
    p_config:{}
  });
  if(error)fail(`/app/assinaturas/documentos/${documentId}`,error.message);
  revalidatePath(`/app/assinaturas/documentos/${documentId}`);
}

export async function freezeAdvancedSignatureLayout(formData:FormData){
  const documentId=text(formData,"documentId");
  const context=await requireCapability("assinaturas","sign",optional(formData,"projectId"));
  const{error}=await context.supabase.rpc("freeze_advanced_signature_layout",{p_envelope_id:text(formData,"envelopeId")});
  if(error)fail(`/app/assinaturas/documentos/${documentId}`,error.message);
  revalidatePath(`/app/assinaturas/documentos/${documentId}`);
}

async function embedFieldFile(pdf:PDFDocument,pageIndex:number,path:string,mimeType:string,x:number,y:number,width:number,height:number){
  const admin=createSupabaseAdminClient();
  const{data,error}=await admin.storage.from("signature-artifacts").download(path);
  if(error||!data)return false;
  const bytes=new Uint8Array(await data.arrayBuffer());
  const image=mimeType==="image/png"?await pdf.embedPng(bytes):mimeType==="image/jpeg"?await pdf.embedJpg(bytes):null;
  if(!image)return false;
  pdf.getPage(pageIndex).drawImage(image,{x,y,width,height,preserveAspectRatio:true});
  return true;
}

export async function finalizeAdvancedEnvelope(formData:FormData){
  const documentId=text(formData,"documentId");
  const envelopeId=text(formData,"envelopeId");
  const context=await requireCapability("assinaturas","sign",optional(formData,"projectId"));
  const admin=createSupabaseAdminClient();

  const{data:envelope,error:envelopeError}=await context.supabase.from("signature_envelopes")
    .select("id,organization_id,document_version_id,status,signature_signers(id,name,legal_name,email,status,signed_at)")
    .eq("id",envelopeId).single();
  if(envelopeError||!envelope?.document_version_id)fail(`/app/assinaturas/documentos/${documentId}`,envelopeError?.message??"Envelope inválido.");
  const{data:version,error:versionError}=await context.supabase.from("signature_document_versions").select("*").eq("id",envelope.document_version_id).single();
  if(versionError||!version?.rendered_pdf_path)fail(`/app/assinaturas/documentos/${documentId}`,versionError?.message??"PDF renderizado não encontrado.");
  const[{data:fields,error:fieldsError},{data:values,error:valuesError},{data:evidence,error:evidenceError}]=await Promise.all([
    context.supabase.from("signature_fields").select("*").eq("document_version_id",version.id).order("signing_order"),
    context.supabase.from("signature_field_values").select("*").in("field_id",(await context.supabase.from("signature_fields").select("id").eq("document_version_id",version.id)).data?.map(item=>item.id)??[]),
    context.supabase.from("signature_evidence_records").select("event_type,signer_id,document_sha256,payload_sha256,metadata,occurred_at").eq("envelope_id",envelopeId).order("occurred_at")
  ]);
  const firstError=fieldsError??valuesError??evidenceError;if(firstError)fail(`/app/assinaturas/documentos/${documentId}`,firstError.message);
  const{data:source,error:sourceError}=await admin.storage.from("signature-artifacts").download(version.rendered_pdf_path);
  if(sourceError||!source)fail(`/app/assinaturas/documentos/${documentId}`,sourceError?.message??"Não foi possível baixar o PDF.");

  const pdf=await PDFDocument.load(await source.arrayBuffer());
  const font=await pdf.embedFont(StandardFonts.Helvetica);
  const valuesByField=new Map((values??[]).map(value=>[value.field_id,value]));
  for(const field of fields??[]){
    const value=valuesByField.get(field.id);if(!value)continue;
    const page=pdf.getPage(field.page_number-1);const{width:pageWidth,height:pageHeight}=page.getSize();
    const x=Number(field.x_ratio)*pageWidth;const boxWidth=Number(field.width_ratio)*pageWidth;const boxHeight=Number(field.height_ratio)*pageHeight;
    const y=pageHeight-(Number(field.y_ratio)*pageHeight)-boxHeight;
    if(["SIGNATURE","INITIALS","PHOTO"].includes(field.field_type)&&value.file_storage_path&&value.file_mime_type){
      const embedded=await embedFieldFile(pdf,field.page_number-1,value.file_storage_path,value.file_mime_type,x,y,boxWidth,boxHeight);
      if(!embedded)page.drawText(value.file_name??field.label??field.field_type,{x,y:y+boxHeight/2,size:8,font,color:rgb(.15,.2,.25),maxWidth:boxWidth});
    }else if(field.field_type==="CHECKBOX"){
      page.drawRectangle({x,y:y+Math.max(0,(boxHeight-12)/2),width:12,height:12,borderWidth:1,borderColor:rgb(.1,.15,.2)});
      if(value.boolean_value)page.drawText("X",{x:x+2,y:y+Math.max(0,(boxHeight-10)/2),size:10,font});
    }else{
      const content=value.text_value??value.file_name??"";
      page.drawText(content,{x,y:y+Math.max(2,boxHeight/2-5),size:Math.min(11,Math.max(7,boxHeight*.45)),font,color:rgb(.08,.12,.18),maxWidth:boxWidth,lineHeight:11});
    }
  }
  const finalBytes=await pdf.save();const finalSha=sha256(finalBytes);
  const finalPath=`${context.organizationId}/documents/${documentId}/final/${envelopeId}.pdf`;
  const audit={version:1,envelopeId,documentId,renderedSha256:version.rendered_pdf_sha256,finalSha256:finalSha,signers:envelope.signature_signers,fields:(fields??[]).map(field=>({id:field.id,type:field.field_type,page:field.page_number,signerId:field.signer_id,valueHash:valuesByField.get(field.id)?.value_sha256??null,fileHash:valuesByField.get(field.id)?.file_sha256??null})),events:evidence??[],generatedAt:new Date().toISOString()};
  const auditText=JSON.stringify(audit,null,2);const auditSha=sha256(auditText);const auditPath=`${context.organizationId}/documents/${documentId}/audit/${envelopeId}.json`;
  const[finalUpload,auditUpload]=await Promise.all([
    admin.storage.from("signature-artifacts").upload(finalPath,finalBytes,{contentType:PDF_MIME,upsert:false}),
    admin.storage.from("signature-artifacts").upload(auditPath,auditText,{contentType:"application/json",upsert:false})
  ]);
  if(finalUpload.error||auditUpload.error)fail(`/app/assinaturas/documentos/${documentId}`,finalUpload.error?.message??auditUpload.error?.message??"Falha ao armazenar artefatos finais.");

  const{error}=await context.supabase.rpc("finalize_advanced_signature_envelope",{
    p_envelope_id:envelopeId,p_final_pdf_path:finalPath,p_final_pdf_sha256:finalSha,p_audit_artifact_path:auditPath,p_audit_artifact_sha256:auditSha
  });
  if(error)fail(`/app/assinaturas/documentos/${documentId}`,error.message);
  revalidatePath(`/app/assinaturas/documentos/${documentId}`);revalidatePath("/cliente/assinaturas");
}

export async function queueAdvancedSignatureCopy(formData:FormData){
  const documentId=text(formData,"documentId");
  const context=await requireCapability("assinaturas","release_to_client",optional(formData,"projectId"));
  const{data,error}=await context.supabase.rpc("queue_signature_copy_delivery",{
    p_envelope_id:text(formData,"envelopeId"),
    p_recipient_user_id:optional(formData,"recipientUserId"),
    p_recipient_email:text(formData,"recipientEmail"),
    p_channel:text(formData,"channel")||"PORTAL"
  });
  if(error||!data)fail(`/app/assinaturas/documentos/${documentId}`,error?.message??"Não foi possível preparar a cópia.");
  if(text(formData,"channel")==="PORTAL"){
    const admin=createSupabaseAdminClient();
    await admin.rpc("complete_signature_copy_delivery",{p_delivery_id:data,p_status:"DELIVERED",p_error:null});
  }
  revalidatePath(`/app/assinaturas/documentos/${documentId}`);revalidatePath("/cliente/assinaturas");
}
