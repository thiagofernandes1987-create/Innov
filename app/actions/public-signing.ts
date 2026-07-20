"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashCanonical, safeFileName, sha256 } from "@/lib/signatures/crypto";

const MAX_EVIDENCE_SIZE=20*1024*1024;
const ALLOWED_EVIDENCE=[
  "image/png","image/jpeg","image/webp","image/heic",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

function text(formData:FormData,key:string){return String(formData.get(key)??"").trim();}
function fail(token:string,message:string):never{redirect(`/assinar/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);}

function decodeSignatureData(dataUrl:string){
  const match=/^data:(image\/(?:png|jpeg));base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
  if(!match)return null;
  return {mimeType:match[1],bytes:Buffer.from(match[2],"base64")};
}

export async function completePublicSignatureField(formData:FormData){
  const token=text(formData,"token");
  const fieldId=text(formData,"fieldId");
  if(!token||!fieldId)fail(token,"Link ou campo inválido.");
  const tokenHash=sha256(token);
  const admin=createSupabaseAdminClient();
  const[{data:context,error:contextError},{data:fields,error:fieldsError}]=await Promise.all([
    admin.rpc("get_advanced_signing_context",{p_token_sha256:tokenHash}),
    admin.rpc("list_advanced_signer_fields",{p_token_sha256:tokenHash})
  ]);
  const signing=Array.isArray(context)?context[0]:null;
  const field=Array.isArray(fields)?fields.find(item=>item.field_id===fieldId):null;
  if(contextError||fieldsError||!signing||!field)fail(token,"Link expirado ou campo não autorizado.");

  const requestHeaders=await headers();
  const metadata={
    userAgent:requestHeaders.get("user-agent"),
    forwardedFor:requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()??null,
    fieldType:field.field_type,
    capturedAt:new Date().toISOString()
  };

  let textValue:string|null=null;
  let booleanValue:boolean|null=null;
  let filePath:string|null=null;
  let fileName:string|null=null;
  let fileMime:string|null=null;
  let fileSize:number|null=null;
  let fileSha:string|null=null;

  if(field.field_type==="CHECKBOX"){
    booleanValue=formData.get("booleanValue")!==null;
  }else if(["DATE","FULL_NAME","TEXT"].includes(field.field_type)){
    textValue=text(formData,"textValue");
    if(!textValue)fail(token,"Preencha o campo obrigatório.");
  }else{
    const signatureData=text(formData,"signatureData");
    const decoded=signatureData?decodeSignatureData(signatureData):null;
    const file=formData.get("file");
    let bytes:Uint8Array;
    if(decoded){
      bytes=new Uint8Array(decoded.bytes);fileMime=decoded.mimeType;fileName=`${field.field_type.toLowerCase()}.png`;
    }else if(file instanceof File&&file.size>0){
      if(file.size>MAX_EVIDENCE_SIZE)fail(token,"O anexo deve possuir até 20 MB.");
      if(!ALLOWED_EVIDENCE.includes(file.type))fail(token,"Formato de anexo não permitido.");
      bytes=new Uint8Array(await file.arrayBuffer());fileMime=file.type;fileName=safeFileName(file.name);
    }else fail(token,"Envie ou capture a evidência solicitada.");

    fileSize=bytes.byteLength;fileSha=sha256(bytes);
    filePath=`${signing.envelope_id}/external/${signing.signer_id}/${fieldId}/${randomUUID()}-${safeFileName(fileName)}`;
    const{error:uploadError}=await admin.storage.from("signature-artifacts").upload(filePath,bytes,{contentType:fileMime,upsert:false});
    if(uploadError)fail(token,uploadError.message);
  }

  const valueHash=hashCanonical({fieldId,type:field.field_type,textValue,booleanValue,fileSha});
  const{error}=await admin.rpc("record_advanced_signature_field_value",{
    p_token_sha256:tokenHash,
    p_field_id:fieldId,
    p_text_value:textValue,
    p_boolean_value:booleanValue,
    p_file_storage_path:filePath,
    p_file_name:fileName,
    p_file_mime_type:fileMime,
    p_file_size_bytes:fileSize,
    p_file_sha256:fileSha,
    p_value_sha256:valueHash,
    p_metadata:metadata
  });
  if(error){if(filePath)await admin.storage.from("signature-artifacts").remove([filePath]);fail(token,error.message);}
  redirect(`/assinar/${encodeURIComponent(token)}?saved=${encodeURIComponent(fieldId)}`);
}

export async function finishPublicSignature(formData:FormData){
  const token=text(formData,"token");
  if(!token)fail(token,"Link inválido.");
  const tokenHash=sha256(token);
  const admin=createSupabaseAdminClient();
  const[{data:context,error:contextError},{data:fields,error:fieldsError}]=await Promise.all([
    admin.rpc("get_advanced_signing_context",{p_token_sha256:tokenHash}),
    admin.rpc("list_advanced_signer_fields",{p_token_sha256:tokenHash})
  ]);
  const signing=Array.isArray(context)?context[0]:null;
  if(contextError||fieldsError||!signing||!Array.isArray(fields))fail(token,"Link expirado.");
  if(fields.some(field=>field.required&&!field.completed))fail(token,"Conclua todos os campos obrigatórios.");

  const{data:values,error:valuesError}=await admin.from("signature_field_values")
    .select("field_id,value_sha256,file_sha256,completed_at")
    .in("field_id",fields.map(field=>field.field_id));
  if(valuesError)fail(token,valuesError.message);
  const payloadHash=hashCanonical({
    envelopeId:signing.envelope_id,
    signerId:signing.signer_id,
    documentSha256:signing.rendered_pdf_sha256,
    values:(values??[]).sort((a,b)=>a.field_id.localeCompare(b.field_id))
  });
  const{error}=await admin.rpc("mark_advanced_signer_complete",{
    p_token_sha256:tokenHash,
    p_payload_sha256:payloadHash
  });
  if(error)fail(token,error.message);
  redirect(`/assinar/${encodeURIComponent(token)}?completed=1`);
}
