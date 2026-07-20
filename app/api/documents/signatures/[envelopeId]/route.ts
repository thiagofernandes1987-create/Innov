import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeFileName } from "@/lib/signatures/crypto";

export async function GET(_request:NextRequest,{params}:{params:Promise<{envelopeId:string}>}){
  const{envelopeId}=await params;
  const supabase=await createSupabaseServerClient();
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});

  const{data:envelope,error}=await supabase.from("signature_envelopes")
    .select("id,organization_id,document_version_id,final_document_path,final_document_sha256,status")
    .eq("id",envelopeId).maybeSingle();
  if(error||!envelope||envelope.status!=="COMPLETED"||!envelope.final_document_path){
    return NextResponse.json({error:"Documento não encontrado ou não liberado."},{status:404});
  }

  let title=`documento-assinado-${envelopeId.slice(0,8)}`;
  if(envelope.document_version_id){
    const{data:version}=await supabase.from("signature_document_versions").select("document_id").eq("id",envelope.document_version_id).maybeSingle();
    if(version){const{data:document}=await supabase.from("signature_documents").select("title").eq("id",version.document_id).maybeSingle();if(document?.title)title=document.title;}
  }

  const admin=createSupabaseAdminClient();
  const{data:file,error:downloadError}=await admin.storage.from("signature-artifacts").download(envelope.final_document_path);
  if(downloadError||!file)return NextResponse.json({error:"Arquivo indisponível."},{status:404});
  await admin.from("document_access_logs").insert({
    organization_id:envelope.organization_id,
    actor_user_id:user.id,
    resource_type:"SIGNATURE_ENVELOPE",
    resource_id:envelope.id,
    action:"DOWNLOAD_SIGNED_COPY",
    correlation_id:crypto.randomUUID()
  });
  return new NextResponse(await file.arrayBuffer(),{
    status:200,
    headers:{
      "content-type":"application/pdf",
      "content-disposition":`attachment; filename="${safeFileName(title)}.pdf"`,
      "cache-control":"private, no-store, max-age=0",
      "x-document-sha256":envelope.final_document_sha256??""
    }
  });
}
