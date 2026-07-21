import{NextResponse}from"next/server";
import{createSupabaseAdminClient}from"@/lib/supabase/admin";
import{createSupabaseServerClient}from"@/lib/supabase/server";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;const supabase=await createSupabaseServerClient();
 const{data:userResult}=await supabase.auth.getUser();
 if(!userResult.user)return NextResponse.json({error:"Não autenticado."},{status:401});
 const{data:attachment,error}=await supabase.from("sac_ticket_attachments").select("storage_path,file_name").eq("id",id).maybeSingle();
 if(error||!attachment)return NextResponse.json({error:"Arquivo não encontrado ou não autorizado."},{status:404});
 const admin=createSupabaseAdminClient();const{data:signed,error:signedError}=await admin.storage.from("crm-sac-attachments").createSignedUrl(attachment.storage_path,60,{download:attachment.file_name});
 if(signedError||!signed?.signedUrl)return NextResponse.json({error:"Não foi possível gerar o download."},{status:500});
 return NextResponse.redirect(signed.signedUrl,302);
}
