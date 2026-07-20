import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const{id}=await params;const supabase=await createSupabaseServerClient();const{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.redirect(new URL("/login",request.url));
  const{data:answer,error}=await supabase.from("quality_form_answers").select("file_storage_path,file_name").eq("id",id).single();
  if(error||!answer?.file_storage_path)return new NextResponse("Anexo não encontrado ou não autorizado.",{status:404});
  const{data:signed,error:signedError}=await supabase.storage.from("quality-form-attachments").createSignedUrl(answer.file_storage_path,120,{download:request.nextUrl.searchParams.get("download")==="1"?(answer.file_name??true):false});
  if(signedError||!signed?.signedUrl)return new NextResponse("Não foi possível abrir o anexo.",{status:500});
  return NextResponse.redirect(signed.signedUrl);
}
