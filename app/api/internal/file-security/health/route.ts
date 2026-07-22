import{NextResponse}from"next/server";
import{
 FILE_SECURITY_HEALTH_PATH,
 verifyFileSecurityHealthSignature
}from"@/lib/file-security/health-auth";
import{checkFileSecurityProvider}from"@/lib/file-security/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function json(body:Record<string,unknown>,status:number){
 return NextResponse.json(body,{
  status,
  headers:{
   "Cache-Control":"private, no-store, max-age=0",
   "X-Content-Type-Options":"nosniff"
  }
 });
}

export async function POST(request:Request){
 const secret=process.env.FILE_SECURITY_HEALTH_SECRET?.trim()??"";
 if(secret.length<32)return json({status:"unavailable",reason:"configuration"},503);
 const authorized=verifyFileSecurityHealthSignature({
  secret,
  timestamp:request.headers.get("x-innov-timestamp"),
  signature:request.headers.get("x-innov-signature"),
  method:"POST",
  path:FILE_SECURITY_HEALTH_PATH
 });
 if(!authorized)return json({status:"unauthorized"},401);
 try{
  const health=await checkFileSecurityProvider();
  return json(health,200);
 }catch{
  return json({status:"unavailable",reason:"provider"},503);
 }
}
