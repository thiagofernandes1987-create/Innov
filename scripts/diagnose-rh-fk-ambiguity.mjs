import{spawnSync}from"node:child_process";
import fs from"node:fs";
function docker(args,options={}){return spawnSync("docker",args,{encoding:"utf8",timeout:180000,...options});}
function must(r,label){if(r.status!==0)throw new Error(`${label}\n${r.stdout??""}\n${r.stderr??""}`);return r;}
function apply(container,db,file){must(docker(["exec","-i",container,"psql","-U","postgres","-d",db,"-v","ON_ERROR_STOP=1","-q"],{input:fs.readFileSync(file,"utf8")}),file);}
function sleep(ms){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);}
function waitDatabase(container,db){
 for(let i=0;i<100;i++){
  const r=docker(["exec",container,"psql","-U","postgres","-d",db,"-Atc","select 1"],{timeout:5000});
  if(r.status===0&&r.stdout.trim()==="1")return;
  sleep(500);
 }
 const logs=docker(["logs",container],{timeout:5000});
 throw new Error(`Postgres/banco ${db} não ficou pronto.\n${logs.stdout??""}\n${logs.stderr??""}`);
}
const container=`innov-rh-fk-${process.pid}`,db="rh_fk_diag";
try{
 must(docker(["run","-d","--rm","--name",container,"-e","POSTGRES_PASSWORD=postgres","-e",`POSTGRES_DB=${db}`,"postgres:16-alpine"]),"postgres");
 waitDatabase(container,db);
 apply(container,db,"supabase/tests/rh/fixture.sql");
 for(const name of fs.readdirSync("supabase/migrations").filter(n=>/_rh_.*\.sql$/.test(n)).sort())apply(container,db,`supabase/migrations/${name}`);
 const sql=`
with f as (
 select c.oid,c.conname,c.conrelid,c.confrelid,c.conkey,c.confkey,
        c.conrelid::regclass::text source_table,c.confrelid::regclass::text target_table,
        pg_get_constraintdef(c.oid) definition
 from pg_constraint c
 where c.contype='f' and c.conrelid::regclass::text like 'rh_%'
), pairs as (
 select s.source_table,s.target_table,s.conname simple_constraint,s.definition simple_definition,
        m.conname composite_constraint,m.definition composite_definition
 from f s join f m on m.conrelid=s.conrelid and m.confrelid=s.confrelid and m.oid<>s.oid
 where cardinality(s.conkey)=1 and cardinality(m.conkey)>1
   and s.conkey[1]=any(m.conkey) and s.confkey[1]=any(m.confkey)
   and exists(select 1 from unnest(m.conkey) k join pg_attribute a on a.attrelid=m.conrelid and a.attnum=k where a.attname='organization_id')
   and exists(select 1 from unnest(m.confkey) k join pg_attribute a on a.attrelid=m.confrelid and a.attnum=k where a.attname='organization_id')
)
select source_table||'|'||target_table||'|'||simple_constraint||'|'||composite_constraint||'|'||simple_definition||'|'||composite_definition from pairs order by source_table,target_table,simple_constraint;
`;
 const out=must(docker(["exec",container,"psql","-U","postgres","-d",db,"-Atc",sql]),"diagnóstico").stdout;
 fs.mkdirSync(".evidence/rh",{recursive:true});fs.writeFileSync(".evidence/rh/redundant-foreign-keys.txt",out);console.log(out||"Nenhuma FK simples redundante encontrada.");
}finally{docker(["rm","-f",container],{timeout:20000});}
