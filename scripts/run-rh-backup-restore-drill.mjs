import{spawnSync}from"node:child_process";
import{createHash}from"node:crypto";
import fs from"node:fs";

function docker(args,options={}){return spawnSync("docker",args,{encoding:"utf8",timeout:180_000,...options});}
function output(result){return`${result.stdout??""}\n${result.stderr??""}`.trim();}
function must(result,label){if(result.status!==0)throw new Error(`${label} falhou.\n${output(result)}`);return result;}
function exec(container,args,options={}){return docker(["exec",...args.slice(0,1),container,...args.slice(1)],options);}
function psql(container,database,sql){return must(docker(["exec",container,"psql","-U","postgres","-d",database,"-v","ON_ERROR_STOP=1","-Atc",sql]),`psql ${database}`).stdout.trim();}
function applyFile(container,database,file){if(!fs.existsSync(file))throw new Error(`Arquivo ausente: ${file}`);const result=docker(["exec","--interactive",container,"psql","-U","postgres","-d",database,"-v","ON_ERROR_STOP=1","-q"],{input:fs.readFileSync(file,"utf8")});must(result,`aplicação ${file}`);}
function snapshot(container,database){
 const tableNames=psql(container,database,"select string_agg(tablename,',' order by tablename) from pg_tables where schemaname='public' and tablename like 'rh_%';").split(",").filter(Boolean);
 const counts={};for(const table of tableNames)counts[table]=Number(psql(container,database,`select count(*) from public.${table};`)||0);
 return{
  tables:tableNames,
  counts,
  functions:Number(psql(container,database,"select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%rh%';")||0),
  rlsTables:Number(psql(container,database,"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname like 'rh_%' and c.relrowsecurity;")||0),
  policies:Number(psql(container,database,"select count(*) from pg_policies where schemaname='public' and tablename like 'rh_%';")||0)
 };
}
function compare(source,target){const errors=[];if(JSON.stringify(source.tables)!==JSON.stringify(target.tables))errors.push("catálogo de tabelas RH divergiu");if(source.functions!==target.functions)errors.push(`funções RH ${source.functions} != ${target.functions}`);if(source.rlsTables!==target.rlsTables)errors.push(`RLS ${source.rlsTables} != ${target.rlsTables}`);if(source.policies!==target.policies)errors.push(`policies ${source.policies} != ${target.policies}`);for(const table of source.tables)if(source.counts[table]!==target.counts[table])errors.push(`${table}: ${source.counts[table]} != ${target.counts[table]}`);return errors;}

const version=docker(["version","--format","{{.Server.Version}}"],{timeout:15_000});must(version,"Docker");
const container=`innov-rh-restore-${process.pid}`;const sourceDb="rh_restore_source",targetDb="rh_restore_target";const dump="/tmp/rh-restore.dump";
try{
 must(docker(["run","--detach","--rm","--name",container,"--env","POSTGRES_PASSWORD=postgres","--env",`POSTGRES_DB=${sourceDb}`,"postgres:16-alpine"]),"inicialização PostgreSQL");
 let ready=false;for(let i=0;i<60;i++){const logs=docker(["logs",container],{timeout:5_000}),health=docker(["exec",container,"pg_isready","-U","postgres","-d",sourceDb],{timeout:5_000});if(`${logs.stdout}\n${logs.stderr}`.includes("PostgreSQL init process complete; ready for start up.")&&health.status===0){ready=true;break;}Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,500);}if(!ready)throw new Error("PostgreSQL do drill não ficou pronto.");
 const migrations=fs.readdirSync("supabase/migrations").filter(name=>/_rh_.*\.sql$/.test(name)).sort().map(name=>`supabase/migrations/${name}`);if(!migrations.length)throw new Error("Nenhuma migration RH localizada.");
 applyFile(container,sourceDb,"supabase/tests/rh/fixture.sql");for(const migration of migrations)applyFile(container,sourceDb,migration);
 for(const seed of["supabase/tests/rh/payroll-v1.test.sql","supabase/tests/rh/payroll-irrf-2026.test.sql","supabase/tests/rh/benefits-documents.test.sql"])applyFile(container,sourceDb,seed);
 const before=snapshot(container,sourceDb);if(before.tables.length<20)throw new Error(`Drill encontrou poucas tabelas RH (${before.tables.length}).`);if(Object.values(before.counts).reduce((a,b)=>a+b,0)<10)throw new Error("Drill não possui dados RH sintéticos suficientes para validar restauração.");
 must(docker(["exec",container,"pg_dump","-U","postgres","-d",sourceDb,"--format=custom","--no-owner","--file",dump]),"pg_dump RH");
 const dumpHash=must(docker(["exec",container,"sha256sum",dump]),"hash do dump").stdout.trim().split(/\s+/)[0];if(!/^[a-f0-9]{64}$/.test(dumpHash))throw new Error("SHA-256 do dump inválido.");
 must(docker(["exec",container,"createdb","-U","postgres",targetDb]),"criação banco restaurado");must(docker(["exec",container,"pg_restore","-U","postgres","--no-owner","--exit-on-error","-d",targetDb,dump]),"pg_restore RH");
 const after=snapshot(container,targetDb),differences=compare(before,after);if(differences.length)throw new Error(`Restauração RH divergiu: ${differences.join("; ")}`);
 const report={status:"passed",migrations:migrations.length,tables:before.tables.length,rlsTables:before.rlsTables,policies:before.policies,functions:before.functions,totalRows:Object.values(before.counts).reduce((a,b)=>a+b,0),dumpSha256:dumpHash,verifiedAt:new Date().toISOString()};
 fs.mkdirSync(".evidence/rh",{recursive:true});fs.writeFileSync(".evidence/rh/backup-restore-drill.json",JSON.stringify(report,null,2)+"\n");console.log(`RH backup/restore drill aprovado: ${report.tables} tabelas, ${report.totalRows} linhas, dump ${report.dumpSha256.slice(0,12)}…`);
}finally{docker(["rm","--force",container],{timeout:20_000});}
