import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const directory="supabase/migrations";
const errors=[];
const files=fs.readdirSync(directory).filter(file=>file.endsWith(".sql")).sort();
const versions=new Map();
const logicalNames=new Map();
const hashes=new Map();

for(const file of files){
 const match=file.match(/^(\d{14})_([a-z0-9_]+)\.sql$/);
 if(!match){errors.push(`Nome de migration inválido: ${file}`);continue;}
 const [,version,logicalName]=match;
 if(versions.has(version))errors.push(`Timestamp duplicado ${version}: ${versions.get(version)} e ${file}`);
 else versions.set(version,file);
 if(logicalNames.has(logicalName))errors.push(`Nome lógico duplicado ${logicalName}: ${logicalNames.get(logicalName)} e ${file}`);
 else logicalNames.set(logicalName,file);
 const content=fs.readFileSync(path.join(directory,file),"utf8").replace(/\r\n/g,"\n").trim();
 if(!content)errors.push(`Migration vazia: ${file}`);
 const hash=crypto.createHash("sha256").update(content).digest("hex");
 if(hashes.has(hash))errors.push(`Conteúdo SQL duplicado: ${hashes.get(hash)} e ${file}`);
 else hashes.set(hash,file);
}

for(const file of[
 "20260720233052_stage17_inventory_concurrency_locks.sql",
 "20260720233657_stage17_homologation_balance_project_scope.sql",
 "20260720234333_stage17_inventory_performance_indexes.sql",
 "20260720234549_stage17_inventory_rpc_privileges.sql"
])if(!files.includes(file))errors.push(`Migration canônica do ledger remoto ausente: ${file}`);

for(const obsolete of[
 "20260720160800_stage17_inventory_concurrency_locks.sql",
 "20260720160900_stage17_inventory_performance_indexes.sql",
 "20260720161000_stage17_inventory_rpc_privileges.sql"
])if(files.includes(obsolete))errors.push(`Migration obsoleta que diverge do ledger remoto: ${obsolete}`);

if(errors.length){
 console.error(`Ledger local de migrations inválido (${errors.length} falha(s)):`);
 for(const error of errors)console.error(`- ${error}`);
 process.exit(1);
}

console.log(`Ledger local validado: ${files.length} migrations, timestamps, nomes lógicos e conteúdos únicos.`);
