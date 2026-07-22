import http from"node:http";
import net from"node:net";
import{createHash,createHmac,timingSafeEqual}from"node:crypto";

const PORT=Number(process.env.PORT??8080);
const SHARED_SECRET=(process.env.SCANNER_SHARED_SECRET??"").trim();
const CLAMAV_HOST=(process.env.CLAMAV_HOST??"clamav").trim();
const CLAMAV_PORT=Number(process.env.CLAMAV_PORT??3310);
const CLAMAV_TIMEOUT_MS=Number(process.env.CLAMAV_TIMEOUT_MS??15000);
const MAX_FILE_BYTES=Number(process.env.MAX_FILE_BYTES??25*1024*1024);
const MAX_SKEW_SECONDS=Number(process.env.MAX_SKEW_SECONDS??300);
const SCAN_PATH="/v1/scan";
const CHUNK_SIZE=64*1024;

function json(response,status,body){
 const payload=Buffer.from(JSON.stringify(body)+"\n","utf8");
 response.writeHead(status,{
  "Content-Type":"application/json; charset=utf-8",
  "Content-Length":payload.length,
  "Cache-Control":"private, no-store, max-age=0",
  "X-Content-Type-Options":"nosniff"
 });
 response.end(payload);
}

function safeEqualHex(left,right){
 if(!/^[a-f0-9]{64}$/i.test(left)||!/^[a-f0-9]{64}$/i.test(right))return false;
 const a=Buffer.from(left,"hex");
 const b=Buffer.from(right,"hex");
 return a.length===b.length&&timingSafeEqual(a,b);
}

function expectedSignature(timestamp,sha256){
 return createHmac("sha256",SHARED_SECRET)
  .update(`${timestamp}\nPOST\n${SCAN_PATH}\n${sha256.toLowerCase()}`)
  .digest("hex");
}

function verifyRequest(request,sha256){
 const timestamp=request.headers["x-innov-timestamp"];
 const signature=request.headers["x-innov-signature"];
 const declaredSha=request.headers["x-innov-content-sha256"];
 if(SHARED_SECRET.length<32||typeof timestamp!=="string"||typeof signature!=="string"||typeof declaredSha!=="string")return false;
 const parsedTimestamp=Number(timestamp);
 const now=Math.floor(Date.now()/1000);
 if(!Number.isInteger(parsedTimestamp)||Math.abs(now-parsedTimestamp)>MAX_SKEW_SECONDS)return false;
 if(!safeEqualHex(declaredSha,sha256))return false;
 return safeEqualHex(signature,expectedSignature(timestamp,sha256));
}

function parseClamAvResponse(value){
 const response=value.replace(/\0/g,"").trim();
 if(/:\s*OK$/i.test(response))return{status:"CLEAN",signature:null};
 const found=response.match(/:\s*(.+?)\s+FOUND$/i);
 if(found)return{status:"BLOCKED",signature:found[1]?.trim()||"malware"};
 throw Object.assign(new Error("Resposta inválida do ClamAV."),{code:"CLAMAV_RESPONSE"});
}

function scanWithClamAv(buffer){
 return new Promise((resolve,reject)=>{
  const socket=net.createConnection({host:CLAMAV_HOST,port:CLAMAV_PORT});
  const response=[];
  let settled=false;
  const finish=(error)=>{
   if(settled)return;
   settled=true;
   socket.destroy();
   if(error)return reject(error);
   try{resolve(parseClamAvResponse(Buffer.concat(response).toString("utf8")));}
   catch(parseError){reject(parseError);}
  };
  socket.setTimeout(CLAMAV_TIMEOUT_MS,()=>finish(Object.assign(new Error("ClamAV timeout."),{code:"CLAMAV_TIMEOUT"})));
  socket.on("error",error=>finish(Object.assign(new Error(error.message),{code:"CLAMAV_UNAVAILABLE"})));
  socket.on("data",chunk=>response.push(Buffer.from(chunk)));
  socket.on("end",()=>finish());
  socket.on("connect",()=>{
   socket.write(Buffer.from("zINSTREAM\0","utf8"));
   for(let offset=0;offset<buffer.length;offset+=CHUNK_SIZE){
    const chunk=buffer.subarray(offset,Math.min(offset+CHUNK_SIZE,buffer.length));
    const size=Buffer.allocUnsafe(4);size.writeUInt32BE(chunk.length,0);
    socket.write(size);socket.write(chunk);
   }
   socket.write(Buffer.alloc(4));
  });
 });
}

function pingClamAv(){
 return new Promise((resolve,reject)=>{
  const socket=net.createConnection({host:CLAMAV_HOST,port:CLAMAV_PORT});
  const response=[];
  let settled=false;
  const finish=(error)=>{
   if(settled)return;
   settled=true;
   socket.destroy();
   if(error)return reject(error);
   const value=Buffer.concat(response).toString("utf8").replace(/\0/g,"").trim();
   if(value!=="PONG")return reject(new Error("Resposta PING inválida."));
   resolve();
  };
  socket.setTimeout(CLAMAV_TIMEOUT_MS,()=>finish(new Error("ClamAV timeout.")));
  socket.on("error",finish);
  socket.on("data",chunk=>response.push(Buffer.from(chunk)));
  socket.on("end",()=>finish());
  socket.on("connect",()=>socket.write(Buffer.from("zPING\0","utf8")));
 });
}

async function readBody(request){
 const chunks=[];
 let total=0;
 for await(const chunk of request){
  total+=chunk.length;
  if(total>MAX_FILE_BYTES){
   request.destroy();
   throw Object.assign(new Error("Arquivo excede o limite."),{code:"FILE_TOO_LARGE"});
  }
  chunks.push(Buffer.from(chunk));
 }
 if(total===0)throw Object.assign(new Error("Arquivo vazio."),{code:"EMPTY_FILE"});
 return Buffer.concat(chunks);
}

const server=http.createServer(async(request,response)=>{
 const requestId=createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0,12);
 if(request.method==="GET"&&request.url==="/health"){
  try{
   await pingClamAv();
   return json(response,200,{status:"healthy",provider:"clamav",requestId});
  }catch{
   return json(response,503,{status:"unavailable",code:"CLAMAV_UNAVAILABLE",requestId});
  }
 }
 if(request.method!=="POST"||request.url!==SCAN_PATH)return json(response,404,{status:"not_found",requestId});
 try{
  const body=await readBody(request);
  const sha256=createHash("sha256").update(body).digest("hex");
  if(!verifyRequest(request,sha256))return json(response,401,{status:"unauthorized",requestId});
  const started=Date.now();
  const result=await scanWithClamAv(body);
  if(result.status==="BLOCKED"){
   console.warn(JSON.stringify({event:"file_security_gateway_scan",requestId,status:"BLOCKED",durationMs:Date.now()-started}));
   return json(response,422,{status:"BLOCKED",provider:"clamav",signature:result.signature,requestId,durationMs:Date.now()-started});
  }
  console.log(JSON.stringify({event:"file_security_gateway_scan",requestId,status:"CLEAN",durationMs:Date.now()-started}));
  return json(response,200,{status:"CLEAN",provider:"clamav",requestId,durationMs:Date.now()-started});
 }catch(error){
  const code=typeof error?.code==="string"?error.code:"SCANNER_ERROR";
  const status=code==="FILE_TOO_LARGE"?413:code==="EMPTY_FILE"?400:503;
  console.error(JSON.stringify({event:"file_security_gateway_error",requestId,code}));
  return json(response,status,{status:"ERROR",code,requestId});
 }
});

if(!Number.isInteger(PORT)||PORT<1||PORT>65535)throw new Error("PORT inválida.");
if(SHARED_SECRET.length<32)throw new Error("SCANNER_SHARED_SECRET deve possuir ao menos 32 caracteres.");
if(!CLAMAV_HOST)throw new Error("CLAMAV_HOST ausente.");
if(!Number.isInteger(CLAMAV_PORT)||CLAMAV_PORT<1||CLAMAV_PORT>65535)throw new Error("CLAMAV_PORT inválida.");
if(!Number.isFinite(CLAMAV_TIMEOUT_MS)||CLAMAV_TIMEOUT_MS<1000)throw new Error("CLAMAV_TIMEOUT_MS inválido.");
if(!Number.isFinite(MAX_FILE_BYTES)||MAX_FILE_BYTES<1)throw new Error("MAX_FILE_BYTES inválido.");

server.listen(PORT,"0.0.0.0",()=>console.log(JSON.stringify({event:"file_security_gateway_started",port:PORT})));
