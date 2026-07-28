import fs from"node:fs";
import net from"node:net";
import{createHash}from"node:crypto";

const reportPath="stage20-file-security-report.json";
const host=(process.env.CLAMAV_HOST??"127.0.0.1").trim();
const port=Number(process.env.CLAMAV_PORT??3310);
const timeoutMs=Number(process.env.CLAMAV_TIMEOUT_MS??15_000);
const healthOnly=process.argv.includes("--health-only");
const chunkSize=64*1024;
const startedAt=new Date().toISOString();
const started=Date.now();
let failure=null;

function assert(condition,message){if(!condition)throw new Error(message);}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function endpointFingerprint(){return createHash("sha256").update(`${host}:${port}`).digest("hex").slice(0,16);}

function command(payload){
 return new Promise((resolve,reject)=>{
  const socket=net.createConnection({host,port});
  const chunks=[];
  let settled=false;
  const finish=(error)=>{
   if(settled)return;
   settled=true;
   socket.destroy();
   if(error)reject(error);
   else resolve(Buffer.concat(chunks).toString("utf8").replace(/\0/g,"").trim());
  };
  socket.setTimeout(timeoutMs,()=>finish(new Error("Timeout ao consultar ClamAV.")));
  socket.on("error",finish);
  socket.on("data",chunk=>chunks.push(Buffer.from(chunk)));
  socket.on("end",()=>finish());
  socket.on("connect",()=>socket.end(payload));
 });
}

function scan(buffer){
 return new Promise((resolve,reject)=>{
  const socket=net.createConnection({host,port});
  const chunks=[];
  let settled=false;
  const finish=(error)=>{
   if(settled)return;
   settled=true;
   socket.destroy();
   if(error)return reject(error);
   resolve(Buffer.concat(chunks).toString("utf8").replace(/\0/g,"").trim());
  };
  socket.setTimeout(timeoutMs,()=>finish(new Error("Timeout durante INSTREAM.")));
  socket.on("error",finish);
  socket.on("data",chunk=>chunks.push(Buffer.from(chunk)));
  socket.on("end",()=>finish());
  socket.on("connect",()=>{
   socket.write(Buffer.from("zINSTREAM\0","utf8"));
   for(let offset=0;offset<buffer.length;offset+=chunkSize){
    const chunk=buffer.subarray(offset,Math.min(offset+chunkSize,buffer.length));
    const size=Buffer.allocUnsafe(4);size.writeUInt32BE(chunk.length,0);
    socket.write(size);socket.write(chunk);
   }
   socket.write(Buffer.alloc(4));
  });
 });
}

async function waitForClamAv(){
 let lastError;
 for(let attempt=1;attempt<=60;attempt+=1){
  try{
   const response=await command(Buffer.from("zPING\0","utf8"));
   if(response==="PONG")return{attempt,response};
   lastError=new Error(`Resposta PING inesperada: ${response||"vazia"}`);
  }catch(error){lastError=error;}
  await delay(2_000);
 }
 throw lastError??new Error("ClamAV não ficou pronto.");
}

const report={
 schemaVersion:1,
 status:"running",
 mode:healthOnly?"provider_health":"protocol_e2e",
 endpointFingerprint:endpointFingerprint(),
 startedAt,
 checks:[]
};

try{
 assert(host,"CLAMAV_HOST ausente.");
 assert(Number.isInteger(port)&&port>0&&port<=65535,"CLAMAV_PORT inválida.");
 assert(Number.isFinite(timeoutMs)&&timeoutMs>=1_000,"CLAMAV_TIMEOUT_MS inválido.");
 const readiness=await waitForClamAv();
 report.checks.push({name:"ping",ok:true,attempt:readiness.attempt,response:"PONG"});

 const cleanResponse=await scan(Buffer.from("%PDF-1.7\nInnov Stage 20 clean fixture\n","utf8"));
 assert(/:\s*OK$/i.test(cleanResponse),`Fixture limpa não foi liberada: ${cleanResponse}`);
 report.checks.push({name:"clean_file",ok:true,result:"CLEAN"});

 if(!healthOnly){
  const eicar=Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*","ascii");
  const blockedResponse=await scan(eicar);
  assert(/\sFOUND$/i.test(blockedResponse),`EICAR não foi bloqueado: ${blockedResponse}`);
  const signature=blockedResponse.match(/:\s*(.+?)\s+FOUND$/i)?.[1]?.trim()??"detected";
  report.checks.push({name:"eicar_blocked",ok:true,result:"BLOCKED",signature});
 }

 report.status="passed";
 report.durationMs=Date.now()-started;
 report.finishedAt=new Date().toISOString();
}catch(error){
 failure=error instanceof Error?error:new Error(String(error));
 report.status="failed";
 report.durationMs=Date.now()-started;
 report.finishedAt=new Date().toISOString();
 report.error=failure.message.slice(0,1000);
}finally{
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report,null,2));
}

if(failure)throw failure;
