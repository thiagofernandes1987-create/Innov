import"server-only";
import net from"node:net";
import{createHash,randomUUID}from"node:crypto";
import{createClient}from"@supabase/supabase-js";
import{
 assertFileContentSignature,
 assertFileSecurityInput,
 FILE_SECURITY_MAX_BYTES,
 FileSecurityError,
 parseClamAvResponse,
 type FileSecurityProvider,
 type FileSecurityScanResult
}from"@/lib/file-security/domain";
import{
 createFileSecurityGatewaySignature,
 FILE_SECURITY_GATEWAY_PATH
}from"@/lib/file-security/gateway-auth";

const DEFAULT_QUARANTINE_BUCKET="file-quarantine";
const DEFAULT_CLAMAV_PORT=3310;
const DEFAULT_TIMEOUT_MS=15_000;
const CHUNK_SIZE=64*1024;

type SecureUploadInput={
 targetBucket:string;
 targetPath:string;
 body:ArrayBuffer|Uint8Array|Buffer;
 filename:string;
 contentType:string;
 organizationId:string;
 actorUserId:string;
 correlationId?:string|null;
 upsert?:boolean;
};

export type SecureUploadResult={
 scanId:string;
 status:"CLEAN";
 targetBucket:string;
 targetPath:string;
 sha256:string;
 sizeBytes:number;
 provider:FileSecurityProvider;
 scannedAt:string;
};

export type FileSecurityProviderHealth={
 status:"healthy";
 provider:FileSecurityProvider;
 fixtureResult:"CLEAN";
 checkedAt:string;
 durationMs:number;
};

type QuarantineManifest={
 schemaVersion:1;
 scanId:string;
 status:"PENDING"|"SCANNING"|"CLEAN"|"BLOCKED"|"ERROR";
 organizationId:string;
 actorUserId:string;
 correlationId:string|null;
 filename:string;
 contentType:string;
 sizeBytes:number;
 sha256:string;
 targetBucket:string;
 targetPath:string;
 createdAt:string;
 finishedAt?:string;
 provider?:string;
 signature?:string|null;
};

function requiredEnv(name:string){
 const value=process.env[name]?.trim();
 if(!value)throw new FileSecurityError("FILE_SECURITY_CONFIGURATION",`Configuração obrigatória ausente: ${name}.`);
 return value;
}

function configuredTimeout(){
 const timeout=Number(process.env.CLAMAV_TIMEOUT_MS??DEFAULT_TIMEOUT_MS);
 if(!Number.isFinite(timeout)||timeout<1000||timeout>120_000)
  throw new FileSecurityError("CLAMAV_TIMEOUT","Timeout do scanner inválido.");
 return timeout;
}

function serviceClient(){
 return createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),{
  auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}
 });
}

function toBuffer(value:SecureUploadInput["body"]){
 if(Buffer.isBuffer(value))return value;
 if(value instanceof Uint8Array)return Buffer.from(value.buffer,value.byteOffset,value.byteLength);
 return Buffer.from(value);
}

async function ensurePrivateBucket(bucket:string){
 const supabase=serviceClient();
 const{data,error}=await supabase.storage.getBucket(bucket);
 if(!error&&data){
  if(data.public)throw new FileSecurityError("PUBLIC_QUARANTINE_BUCKET","O bucket de quarentena não pode ser público.");
  return;
 }
 const created=await supabase.storage.createBucket(bucket,{public:false,fileSizeLimit:FILE_SECURITY_MAX_BYTES});
 if(created.error&&!/already exists/i.test(created.error.message))
  throw new FileSecurityError("QUARANTINE_BUCKET",`Não foi possível preparar a quarentena: ${created.error.message}`);
}

function scanWithClamAv(buffer:Buffer):Promise<FileSecurityScanResult>{
 const host=requiredEnv("CLAMAV_HOST");
 const port=Number(process.env.CLAMAV_PORT??DEFAULT_CLAMAV_PORT);
 const timeout=configuredTimeout();
 if(!Number.isInteger(port)||port<1||port>65535)throw new FileSecurityError("CLAMAV_PORT","Porta ClamAV inválida.");
 return new Promise((resolve,reject)=>{
  const socket=net.createConnection({host,port});
  const response:Buffer[]=[];
  let settled=false;
  const finish=(error?:Error)=>{
   if(settled)return;
   settled=true;
   socket.destroy();
   if(error)return reject(error);
   const parsed=parseClamAvResponse(Buffer.concat(response).toString("utf8"));
   if(parsed.status==="ERROR")return reject(new FileSecurityError("CLAMAV_RESPONSE","Resposta inválida do ClamAV."));
   resolve(parsed);
  };
  socket.setTimeout(timeout,()=>finish(new FileSecurityError("CLAMAV_TIMEOUT","A análise antimalware excedeu o tempo limite.")));
  socket.on("error",error=>finish(new FileSecurityError("CLAMAV_UNAVAILABLE",`ClamAV indisponível: ${error.message}`)));
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

async function scanWithHttpGateway(buffer:Buffer):Promise<FileSecurityScanResult>{
 const baseUrl=requiredEnv("FILE_SECURITY_SCANNER_URL");
 const secret=requiredEnv("FILE_SECURITY_SCANNER_SECRET");
 if(secret.length<32)throw new FileSecurityError("FILE_SECURITY_CONFIGURATION","FILE_SECURITY_SCANNER_SECRET deve possuir ao menos 32 caracteres.");
 const endpoint=new URL(FILE_SECURITY_GATEWAY_PATH,baseUrl);
 const insecureAllowed=process.env.NODE_ENV==="test"||process.env.ALLOW_INSECURE_FILE_SCANNER==="true";
 if(endpoint.protocol!=="https:"&&!(insecureAllowed&&endpoint.protocol==="http:"))
  throw new FileSecurityError("FILE_SECURITY_GATEWAY_PROTOCOL","O gateway do scanner exige HTTPS.");
 endpoint.search="";endpoint.hash="";
 const sha256=createHash("sha256").update(buffer).digest("hex");
 const timestamp=String(Math.floor(Date.now()/1000));
 const signature=createFileSecurityGatewaySignature({secret,timestamp,sha256});
 let response:Response;
 try{
  response=await fetch(endpoint,{
   method:"POST",
   redirect:"error",
   signal:AbortSignal.timeout(configuredTimeout()),
   headers:{
    "Accept":"application/json",
    "Content-Type":"application/octet-stream",
    "X-Innov-Timestamp":timestamp,
    "X-Innov-Content-SHA256":sha256,
    "X-Innov-Signature":signature
   },
   body:new Uint8Array(buffer)
  });
 }catch(error){
  throw new FileSecurityError("FILE_SECURITY_GATEWAY_UNAVAILABLE",error instanceof Error?error.message:String(error));
 }
 const body=await response.json().catch(()=>null)as null|{status?:string;signature?:string|null;code?:string};
 if(response.status===401||response.status===403)
  throw new FileSecurityError("FILE_SECURITY_GATEWAY_AUTH","O gateway recusou a autenticação da aplicação.");
 if(response.status===422&&body?.status==="BLOCKED")
  return{status:"BLOCKED",provider:"clamav-http",signature:body.signature?.slice(0,200)||"malware",rawCode:"FOUND"};
 if(!response.ok)
  throw new FileSecurityError(body?.code?.slice(0,80)||"FILE_SECURITY_GATEWAY_UNAVAILABLE",`Gateway do scanner retornou HTTP ${response.status}.`);
 if(body?.status!=="CLEAN")
  throw new FileSecurityError("FILE_SECURITY_GATEWAY_RESPONSE","O gateway não retornou um resultado liberável.");
 return{status:"CLEAN",provider:"clamav-http",signature:null,rawCode:"OK"};
}

async function scanBuffer(buffer:Buffer):Promise<FileSecurityScanResult>{
 const provider=(process.env.FILE_SECURITY_PROVIDER??"clamav").trim().toLowerCase();
 if(provider==="test-clean"){
  if(process.env.NODE_ENV!=="test"&&process.env.ALLOW_INSECURE_FILE_SCANNER!=="true")
   throw new FileSecurityError("INSECURE_SCANNER_DISABLED","Provider de teste não permitido neste ambiente.");
  return{status:"CLEAN",provider:"test-clean",signature:null,rawCode:"OK"};
 }
 if(provider==="clamav")return scanWithClamAv(buffer);
 if(provider==="clamav-http")return scanWithHttpGateway(buffer);
 throw new FileSecurityError("FILE_SECURITY_PROVIDER",`Provider de análise não suportado: ${provider}.`);
}

export async function checkFileSecurityProvider():Promise<FileSecurityProviderHealth>{
 const started=Date.now();
 const fixture=Buffer.from("%PDF-1.7\nInnov protected provider health fixture\n","utf8");
 const result=await scanBuffer(fixture);
 if(result.status!=="CLEAN")throw new FileSecurityError("PROVIDER_HEALTH_FAILED","O provider não liberou a fixture de saúde.");
 return{
  status:"healthy",
  provider:result.provider,
  fixtureResult:"CLEAN",
  checkedAt:new Date().toISOString(),
  durationMs:Date.now()-started
 };
}

async function uploadJson(bucket:string,path:string,value:unknown){
 const payload=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
 const{error}=await serviceClient().storage.from(bucket).upload(path,payload,{contentType:"application/json",upsert:true});
 if(error)throw new FileSecurityError("QUARANTINE_MANIFEST",`Falha ao gravar manifesto de segurança: ${error.message}`);
}

export async function secureUpload(input:SecureUploadInput):Promise<SecureUploadResult>{
 const body=toBuffer(input.body);
 const validated=assertFileSecurityInput({filename:input.filename,contentType:input.contentType,sizeBytes:body.length});
 assertFileContentSignature(validated.contentType,body);
 const quarantineBucket=process.env.FILE_SECURITY_QUARANTINE_BUCKET?.trim()||DEFAULT_QUARANTINE_BUCKET;
 await ensurePrivateBucket(quarantineBucket);
 const scanId=randomUUID();
 const base=`pending/${input.organizationId}/${scanId}`;
 const payloadPath=`${base}/payload`;
 const manifestPath=`${base}/manifest.json`;
 const sha256=createHash("sha256").update(body).digest("hex");
 const manifest:QuarantineManifest={
  schemaVersion:1,scanId,status:"PENDING",organizationId:input.organizationId,actorUserId:input.actorUserId,
  correlationId:input.correlationId??null,filename:validated.filename,contentType:validated.contentType,sizeBytes:body.length,
  sha256,targetBucket:input.targetBucket,targetPath:input.targetPath,createdAt:new Date().toISOString()
 };
 const client=serviceClient();
 const quarantine=client.storage.from(quarantineBucket);
 let targetPromoted=false;
 const uploaded=await quarantine.upload(payloadPath,body,{contentType:validated.contentType,upsert:false});
 if(uploaded.error)throw new FileSecurityError("QUARANTINE_UPLOAD",`Falha ao enviar arquivo para quarentena: ${uploaded.error.message}`);
 await uploadJson(quarantineBucket,manifestPath,manifest);
 try{
  manifest.status="SCANNING";
  await uploadJson(quarantineBucket,manifestPath,manifest);
  const result=await scanBuffer(body);
  manifest.provider=result.provider;
  manifest.signature=result.signature;
  const scannedAt=new Date().toISOString();
  manifest.finishedAt=scannedAt;
  if(result.status==="BLOCKED"){
   manifest.status="BLOCKED";
   await uploadJson(quarantineBucket,manifestPath,manifest);
   const blockedBase=`blocked/${input.organizationId}/${scanId}`;
   const moved=await quarantine.move(payloadPath,`${blockedBase}/payload`);
   if(!moved.error){
    await uploadJson(quarantineBucket,`${blockedBase}/manifest.json`,manifest);
    await quarantine.remove([manifestPath]);
   }
   throw new FileSecurityError("MALWARE_DETECTED","O arquivo foi bloqueado pela análise de segurança.");
  }
  if(result.status!=="CLEAN")throw new FileSecurityError("SCAN_FAILED","A análise de segurança não produziu um resultado liberável.");
  const target=client.storage.from(input.targetBucket);
  const promoted=await target.upload(input.targetPath,body,{contentType:validated.contentType,upsert:input.upsert??false});
  if(promoted.error)throw new FileSecurityError("PROMOTION_FAILED",`Arquivo limpo não pôde ser promovido: ${promoted.error.message}`);
  targetPromoted=true;
  manifest.status="CLEAN";
  await uploadJson(quarantineBucket,`results/${input.organizationId}/${scanId}.json`,manifest);
  await quarantine.remove([payloadPath,manifestPath]);
  return{
   scanId,status:"CLEAN",targetBucket:input.targetBucket,targetPath:input.targetPath,
   sha256,sizeBytes:body.length,provider:result.provider,scannedAt
  };
 }catch(error){
  if(targetPromoted)await client.storage.from(input.targetBucket).remove([input.targetPath]).catch(()=>undefined);
  if(error instanceof FileSecurityError&&error.code==="MALWARE_DETECTED")throw error;
  manifest.status="ERROR";manifest.finishedAt=new Date().toISOString();
  await uploadJson(quarantineBucket,manifestPath,manifest).catch(()=>undefined);
  if(error instanceof FileSecurityError)throw error;
  throw new FileSecurityError("SCAN_FAILED",error instanceof Error?error.message:String(error));
 }
}
