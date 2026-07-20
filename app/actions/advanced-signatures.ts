"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireCapability } from "@/lib/authorization";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSigningToken, safeFileName, sha256 } from "@/lib/signatures/crypto";

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
    signers.push({name,email,role:"SIGNER",routing_order:index,token_sha256:tokenSha256,token_expires_at:expiration});
    links.push({name,email,url:`${baseUrl}/assinar/${token}`});
  }
  if(signers.length===0)fail(`/app/assinaturas/documentos/${documentId}`,"Informe ao menos um signatário.");

  const{data:envelopeId,error}=await context.supabase.rpc("create_advanced_signature_envelope",{
    p_organization_id:context.organizationId,
    p_document_id:documentId,
    p_version_id:versionId,
    p_title:text(formData,"title")||"Documento para assinatura",
    p_message:text(formData,"message"),
    p_signers:signers,
    p_expires_at:new Date(Date.now()+7*24*60*60*1000).toISOString()
  });
  if(error||!envelopeId)fail(`/app/assinaturas/documentos/${documentId}`,error?.message??"Não foi possível criar o envelope.");

  const admin=createSupabaseAdminClient();
  const{error:linkError}=await admin.from("signature_delivery_jobs").insert({
    organization_id:context.organizationId,envelope_id:envelopeId,channel:"EMAIL_WEBHOOK",
    payload:{links,message:text(formData,"message")},status:"PENDING"
  });
  if(linkError)fail(`/app/assinaturas/documentos/${documentId}`,linkError.message);
  revalidatePath(`/app/assinaturas/documentos/${documentId}`);
  redirect(`/app/assinaturas/envelopes/${envelopeId}`);
}

export async function addAdvancedSignatureField(formData:FormData){
  const documentId=text(formData,"documentId");
  const context=await requireCapability("assinaturas","update",optional(formData,"projectId"));
  const{error}=await context.supabase.rpc("add_advanced_signature_field",{
    p_organization_id:context.organizationId,
    p_document_id:documentId,
    p_version_id:text(formData,"versionId"),
    p_field_type:text(formData,"fieldType"),
    p_label:text(formData,"label"),
    p_page_number:Number(text(formData,"pageNumber")),
    p_x:numberValue(formData,"x"),p_y:numberValue(formData,"y"),p_width:numberValue(formData,"width"),p_height:numberValue(formData,"height"),
    p_required:text(formData,"required")!=="false",
    p_signer_order:numberValue(formData,"signerOrder")
  });
  if(error)fail(`/app/assinaturas/documentos/${documentId}`,error.message);
  revalidatePath(`/app/assinaturas/documentos/${documentId}`);
}

export async function removeAdvancedSignatureField(formData:FormData){
  const documentId=text(formData,"documentId");
  const context=await requireCapability("assinaturas","update",optional(formData,"projectId"));
  const{error}=await context.supabase.rpc("remove_advanced_signature_field",{
    p_organization_id:context.organizationId,p_field_id:text(formData,"fieldId")
  });
  if(error)fail(`/app/assinaturas/documentos/${documentId}`,error.message);
  revalidatePath(`/app/assinaturas/documentos/${documentId}`);
}

export async function downloadAdvancedSignatureFile(formData:FormData){
  const context=await requireCapability("assinaturas","read",optional(formData,"projectId"));
  const path=text(formData,"path");
  const{data,error}=await context.supabase.storage.from("signature-artifacts").createSignedUrl(path,60);
  if(error||!data?.signedUrl)fail("/app/assinaturas",error?.message??"Não foi possível liberar o download.");
  const cookieStore=await cookies();
  cookieStore.set("signature_download_url",data.signedUrl,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:60,path:"/"});
  redirect("/api/assinaturas/download");
}

export async function createSignaturePreview(formData:FormData){
  const documentId=text(formData,"documentId");
  const context=await requireCapability("assinaturas","read",optional(formData,"projectId"));
  const pdf=await PDFDocument.create();
  const page=pdf.addPage([595,842]);
  const font=await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("Prévia de posicionamento de assinatura",{x:50,y:790,size:16,font,color:rgb(0.12,0.2,0.3)});
  page.drawText(`Documento: ${documentId}`,{x:50,y:765,size:10,font});
  const bytes=await pdf.save();
  const path=`${context.organizationId}/documents/${documentId}/preview/${randomUUID()}.pdf`;
  const{error}=await context.supabase.storage.from("signature-artifacts").upload(path,bytes,{contentType:PDF_MIME});
  if(error)fail(`/app/assinaturas/documentos/${documentId}`,error.message);
  const{data}=await context.supabase.storage.from("signature-artifacts").createSignedUrl(path,60);
  if(!data?.signedUrl)fail(`/app/assinaturas/documentos/${documentId}`,"Não foi possível gerar a prévia.");
  redirect(data.signedUrl);
}
