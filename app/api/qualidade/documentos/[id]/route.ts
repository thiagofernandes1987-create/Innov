import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const{id}=await params;const supabase=await createSupabaseServerClient();
  const{data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.redirect(new URL("/login",request.url));
  const{data:document,error}=await supabase.from("quality_documents").select("storage_path,file_name,mime_type").eq("id",id).single();
  if(error||!document)return new NextResponse("Documento não encontrado ou não autorizado.",{status:404});
  const download=request.nextUrl.searchParams.get("download")==="1";
  const{data:signed,error:signedError}=await supabase.storage.from("quality-documents").createSignedUrl(document.storage_path,120,download?{download:document.file_name}:undefined);
  if(signedError||!signed?.signedUrl)return new NextResponse("Não foi possível abrir o documento.",{status:500});
  return NextResponse.redirect(signed.signedUrl);
}
