import fs from"node:fs";
import{createHash,createHmac}from"node:crypto";

const reportPath="stage20-file-security-gateway-report.json";
const gatewayUrl=process.env.FILE_SECURITY_GATEWAY_TEST_URL?.trim()||"http://127.0.0.1:8080/v1/scan";
const secret=process.env.FILE_SECURITY_GATEWAY_TEST_SECRET?.trim()||"stage20-gateway-test-secret-0123456789abcdef0123456789abcdef";
const timeoutMs=Number(process.env.FILE_SECURITY_GATEWAY_TEST_TIMEOUT_MS??30_000);
const report={schemaVersion:1,status:"running",startedAt:new Date().toISOString(),checks:[]};
let failure=null;

function assert(condition,message){if(!condition)throw new Error(message);}
function signature(timestamp,sha256){
 return createHmac("sha256",secret).update(`${timestamp}\nPOST\n/v1/scan\n${sha256}`).digest("hex");
}

async function scan(name,buffer,expectedStatus,expectedHttp,signatureOverride){
 const sha256=createHash("sha256").update(buffer).digest("hex");
 const timestamp=String(Math.floor(Date.now()/1000));
 const response=await fetch(gatewayUrl,{
  method:"POST",
  redirect:"error",
  signal:AbortSignal.timeout(timeoutMs),
  headers:{
   "Accept":"application/json",
   "Content-Type":"application/octet-stream",
   "X-Innov-Timestamp":timestamp,
   "X-Innov-Content-SHA256":sha256,
   "X-Innov-Signature":signatureOverride??signature(timestamp,sha256)
  },
  body:buffer
 });
 const body=await response.json().catch(()=>({status:"invalid_response"}));
 assert(response.status===expectedHttp,`${name}: HTTP ${response.status}, esperado ${expectedHttp}.`);
 assert(body?.status===expectedStatus,`${name}: status ${body?.status}, esperado ${expectedStatus}.`);
 report.checks.push({name,ok:true,httpStatus:response.status,status:body.status});
}

try{
 assert(secret.length>=32,"Segredo E2E do gateway deve possuir ao menos 32 caracteres.");
 const clean=Buffer.from("%PDF-1.7\nInnov gateway clean fixture\n","utf8");
 const eicar=Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*","utf8");
 await scan("clean_file",clean,"CLEAN",200);
 await scan("invalid_signature",clean,"unauthorized",401,"0".repeat(64));
 await scan("eicar_blocked",eicar,"BLOCKED",422);
 report.status="passed";
 report.finishedAt=new Date().toISOString();
}catch(error){
 failure=error instanceof Error?error:new Error(String(error));
 report.status="failed";
 report.error=failure.message.slice(0,1000);
 report.finishedAt=new Date().toISOString();
}finally{
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report,null,2));
}

if(failure)throw failure;
