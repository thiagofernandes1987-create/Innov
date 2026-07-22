import fs from"node:fs";
import os from"node:os";
import path from"node:path";
import{createHash,randomUUID}from"node:crypto";
import{spawn}from"node:child_process";

const reportPath="stage20-backup-restore-report.json";
const sourceUrl=process.env.SUPABASE_DB_URL;
const targetUrl=process.env.SUPABASE_RESTORE_DB_URL;
const confirmation=process.env.SUPABASE_RESTORE_CONFIRMATION;
const expectedConfirmation="STAGE20_DISPOSABLE_RESTORE";
const runId=`stage20-restore-${Date.now()}-${randomUUID().slice(0,8)}`;
const dumpPath=path.join(os.tmpdir(),`${runId}.dump`);
let failure=null;

function assert(condition,message){if(!condition)throw new Error(message);}
function hashText(value){return createHash("sha256").update(String(value)).digest("hex");}
function sanitize(text,secrets=[]){
 let value=String(text??"");
 for(const secret of secrets.filter(Boolean))value=value.split(secret).join("[REDACTED]");
 return value.replace(/postgres(?:ql)?:\/\/[^\s]+/gi,"postgresql://[REDACTED]").slice(-4000);
}
function parseDatabaseUrl(value,label){
 assert(value,`Variável obrigatória ausente: ${label}`);
 let parsed;
 try{parsed=new URL(value);}catch{throw new Error(`${label} não é uma URL PostgreSQL válida.`);}
 assert(["postgres:","postgresql:"].includes(parsed.protocol),`${label} deve usar protocolo PostgreSQL.`);
 assert(parsed.hostname&&parsed.username&&parsed.pathname.length>1,`${label} está incompleta.`);
 return parsed;
}
function databaseEnv(parsed){
 const sslMode=parsed.searchParams.get("sslmode")??"require";
 return{
  ...process.env,
  PGHOST:parsed.hostname,
  PGPORT:parsed.port||"5432",
  PGDATABASE:decodeURIComponent(parsed.pathname.slice(1)),
  PGUSER:decodeURIComponent(parsed.username),
  PGPASSWORD:decodeURIComponent(parsed.password),
  PGSSLMODE:sslMode
 };
}
function databaseIdentity(parsed){
 const username=decodeURIComponent(parsed.username);
 const database=decodeURIComponent(parsed.pathname.slice(1));
 return`${username}@${parsed.hostname}:${parsed.port||"5432"}/${database}`;
}
function endpointFingerprint(parsed){
 return hashText(databaseIdentity(parsed)).slice(0,16);
}
function run(command,args,{env,input}={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{env:env??process.env,stdio:[input?"pipe":"ignore","pipe","pipe"]});
  let stdout="";let stderr="";
  child.stdout.on("data",chunk=>{stdout+=chunk;});
  child.stderr.on("data",chunk=>{stderr+=chunk;});
  child.on("error",reject);
  child.on("close",code=>{
   if(code===0)return resolve({stdout,stderr});
   reject(new Error(`${command} terminou com código ${code}: ${stderr||stdout}`));
  });
  if(input){child.stdin.write(input);child.stdin.end();}
 });
}
async function commandVersion(command){
 const{stdout,stderr}=await run(command,["--version"]);
 return(stdout||stderr).trim();
}
async function queryJson(env,sql){
 const{stdout}=await run("psql",["--no-psqlrc","--tuples-only","--no-align","--set","ON_ERROR_STOP=1","--command",sql],{env});
 const line=stdout.trim().split("\n").filter(Boolean).at(-1);
 assert(line,"Consulta de verificação não retornou JSON.");
 return JSON.parse(line);
}
async function snapshot(env){
 return queryJson(env,`
select json_build_object(
 'tables',(select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'),
 'rlsTables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity),
 'functions',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
 'migrations',(select count(*) from supabase_migrations.schema_migrations),
 'latestMigration',(select max(version)::text from supabase_migrations.schema_migrations),
 'appModules',(select count(*) from public.app_modules),
 'organizations',(select count(*) from public.organizations),
 'inventoryItems',(select count(*) from public.inventory_items),
 'auditEvents',(select count(*) from public.audit_events)
)::text;
`);
}
function compareSnapshots(source,target){
 const exactKeys=["tables","rlsTables","functions","migrations","latestMigration","appModules","organizations","inventoryItems","auditEvents"];
 const differences=[];
 for(const key of exactKeys)if(String(source[key])!==String(target[key]))differences.push({key,source:source[key],target:target[key]});
 return differences;
}
async function secureRemove(file){
 if(!fs.existsSync(file))return;
 try{
  const size=fs.statSync(file).size;
  const descriptor=fs.openSync(file,"r+");
  const zero=Buffer.alloc(Math.min(size,1024*1024));
  let offset=0;
  while(offset<size){const length=Math.min(zero.length,size-offset);fs.writeSync(descriptor,zero,0,length,offset);offset+=length;}
  fs.closeSync(descriptor);
 }catch{}
 fs.rmSync(file,{force:true});
}

const report={runId,status:"running",startedAt:new Date().toISOString(),checks:[]};
const check=(name,details={})=>report.checks.push({name,ok:true,...details});

try{
 const source=parseDatabaseUrl(sourceUrl,"SUPABASE_DB_URL");
 const target=parseDatabaseUrl(targetUrl,"SUPABASE_RESTORE_DB_URL");
 assert(confirmation===expectedConfirmation,"Confirmação do destino descartável ausente ou inválida.");
 const sourceIdentity=databaseIdentity(source);
 const targetIdentity=databaseIdentity(target);
 assert(sourceIdentity!==targetIdentity,"Origem e destino de restauração não podem ser o mesmo banco.");
 const sourceEnv=databaseEnv(source);
 const targetEnv=databaseEnv(target);
 const secrets=[sourceUrl,targetUrl,source.password,target.password];
 report.sourceFingerprint=endpointFingerprint(source);
 report.targetFingerprint=endpointFingerprint(target);
 check("destructive_target_guard",{sourceAndTargetDistinct:true,confirmation:true});

 const versions={
  pgDump:await commandVersion("pg_dump"),
  pgRestore:await commandVersion("pg_restore"),
  psql:await commandVersion("psql")
 };
 report.toolVersions=versions;
 check("postgres_tools_available",versions);

 const sourceBefore=await snapshot(sourceEnv);
 report.sourceSnapshot=sourceBefore;
 check("source_snapshot",sourceBefore);

 const dumpStarted=Date.now();
 await run("pg_dump",[
  "--format=custom",
  "--no-owner",
  "--schema=public",
  "--schema=supabase_migrations",
  `--file=${dumpPath}`
 ],{env:sourceEnv});
 report.dumpDurationMs=Date.now()-dumpStarted;
 assert(fs.existsSync(dumpPath),"pg_dump não criou o arquivo esperado.");
 fs.chmodSync(dumpPath,0o600);
 const dumpBuffer=fs.readFileSync(dumpPath);
 assert(dumpBuffer.length>1024,"Dump gerado é pequeno demais para representar o schema da plataforma.");
 report.dump={sizeBytes:dumpBuffer.length,sha256:createHash("sha256").update(dumpBuffer).digest("hex")};
 const{stdout:listOutput}=await run("pg_restore",["--list",dumpPath]);
 const objectCount=listOutput.split("\n").filter(line=>line&&!line.startsWith(";")).length;
 assert(objectCount>20,"Dump não contém objetos suficientes para restauração.");
 report.dump.objectCount=objectCount;
 check("dump_integrity",report.dump);

 const restoreStarted=Date.now();
 await run("psql",[
  "--no-psqlrc","--set","ON_ERROR_STOP=1","--command",
  "drop schema if exists public cascade; create schema public; drop schema if exists supabase_migrations cascade;"
 ],{env:targetEnv});
 await run("pg_restore",[
  "--no-owner",
  "--exit-on-error",
  "--dbname",decodeURIComponent(target.pathname.slice(1)),
  dumpPath
 ],{env:targetEnv});
 await run("psql",["--no-psqlrc","--set","ON_ERROR_STOP=1","--command","analyze;"],{env:targetEnv});
 report.restoreDurationMs=Date.now()-restoreStarted;
 report.observedRtoSeconds=Math.ceil(report.restoreDurationMs/1000);
 report.recoveryPointAt=new Date(dumpStarted).toISOString();
 check("isolated_restore_completed",{durationMs:report.restoreDurationMs,observedRtoSeconds:report.observedRtoSeconds});

 const targetAfter=await snapshot(targetEnv);
 report.targetSnapshot=targetAfter;
 const differences=compareSnapshots(sourceBefore,targetAfter);
 report.snapshotDifferences=differences;
 assert(differences.length===0,`Restauração divergiu da origem em ${differences.map(item=>item.key).join(", ")}.`);
 check("source_target_equivalence",{comparedFields:Object.keys(sourceBefore),differences:[]});

 const smoke=await queryJson(targetEnv,`
select json_build_object(
 'moduleRegistryAvailable',(select count(*)>0 from public.app_modules),
 'inventorySchemaAvailable',(select count(*)>0 from information_schema.tables where table_schema='public' and table_name='inventory_movements'),
 'auditSchemaAvailable',(select count(*)>0 from information_schema.tables where table_schema='public' and table_name='audit_events'),
 'rlsEnabled',(select count(*)>0 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity)
)::text;
`);
 assert(Object.values(smoke).every(Boolean),"Smoke test estrutural da restauração falhou.");
 report.smoke=smoke;
 check("restored_smoke_tests",smoke);

 report.status="passed";
 report.finishedAt=new Date().toISOString();
}catch(error){
 failure=error instanceof Error?error:new Error(String(error));
 report.status="failed";
 report.finishedAt=new Date().toISOString();
 report.error=sanitize(failure.message,[sourceUrl,targetUrl]);
}finally{
 await secureRemove(dumpPath);
 report.dumpRemoved=!fs.existsSync(dumpPath);
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report,null,2));
}

if(failure)throw failure;
