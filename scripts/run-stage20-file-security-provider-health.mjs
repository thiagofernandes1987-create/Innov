import fs from"node:fs";
import{createHash,createHmac}from"node:crypto";

const reportPath="stage20-file-security-provider-report.json";
const healthPath="/api/internal/file-security/health";
const appUrl=process.env.HOMOLOGATION_APP_URL?.trim()??"";
const secret=process.env.FILE_SECURITY_HEALTH_SECRET?.trim()??"";
const vercelBypass=process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()??"";
const timeoutMs=Number(process.env.FILE_SECURITY_HEALTH_TIMEOUT_MS??30_000);
const report={
 schemaVersion:1,
 status:"running",
 mode:"provider_health_https",
 startedAt:new Date().toISOString(),
 checks:[]
};
let failure=null;

function assert(condition,message){if(!condition)throw new Error(message);}
function endpointFingerprint(url){return createHash("sha256").update(`${url.origin}${url.pathname}`).digest("hex").slice(0,16);}
function signature(timestamp){
 return createHmac("sha256",secret).update(`${timestamp}\nPOST\n${healthPath}`).digest("hex");
}

try{
 assert(appUrl,"HOMOLOGATION_APP_URL ausente.");
 assert(secret.length>=32,"FILE_SECURITY_HEALTH_SECRET deve possuir ao menos 32 caracteres.");
 assert(vercelBypass.length>=32,"VERCEL_AUTOMATION_BYPASS_SECRET deve possuir ao menos 32 caracteres.");
 assert(Number.isFinite(timeoutMs)&&timeoutMs>=1_000&&timeoutMs<=120_000,"FILE_SECURITY_HEALTH_TIMEOUT_MS inválido.");
 const base=new URL(appUrl);
 assert(base.protocol==="https:","O health check remoto exige HTTPS.");
 const endpoint=new URL(healthPath,base);
 endpoint.search="";endpoint.hash="";
 report.endpointFingerprint=endpointFingerprint(endpoint);
 const timestamp=String(Math.floor(Date.now()/1000));
 const response=await fetch(endpoint,{
  method:"POST",
  redirect:"error",
  signal:AbortSignal.timeout(timeoutMs),
  headers:{
   "Accept":"application/json",
   "X-Innov-Timestamp":timestamp,
   "X-Innov-Signature":signature(timestamp),
   "x-vercel-protection-bypass":vercelBypass
  }
 });
 const body=await response.json().catch(()=>({status:"invalid_response"}));
 assert(response.status===200,`Health check retornou HTTP ${response.status}.`);
 assert(body&&body.status==="healthy"&&body.fixtureResult==="CLEAN","Provider não retornou estado saudável e CLEAN.");
 report.checks.push({name:"deployment_protection_bypass",ok:true});
 report.checks.push({name:"https_hmac",ok:true});
 report.checks.push({name:"provider_fixture",ok:true,result:"CLEAN",provider:String(body.provider??"unknown"),durationMs:Number(body.durationMs??0)});
 report.status="passed";
 report.finishedAt=new Date().toISOString();
}catch(error){
 failure=error instanceof Error?error:new Error(String(error));
 report.status="failed";
 report.finishedAt=new Date().toISOString();
 report.error=failure.message.slice(0,1000);
}finally{
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report,null,2));
}

if(failure)throw failure;
