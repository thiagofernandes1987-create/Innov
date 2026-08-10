export const FGTS_RESCISORY_LAYOUT_VERSION="1.2" as const;
export const FGTS_RESCISORY_LAYOUT_DATE="2025-10-03" as const;
export const FGTS_RESCISORY_CUTOFF="2024-03" as const;

export type FgtsRescisoryRemuneration={competence:string;category?:string|null;principal?:number|null;thirteenth?:number|null;absence?:boolean};
export type FgtsRescisoryWorker={employerRegistration:string;workerCpf:string;admissionDate:string;registrationNumber?:string|null;tsveCategory?:string|null;remunerations:FgtsRescisoryRemuneration[]};

function digits(v:string){return v.replace(/\D/g,"");}
function dateBr(date:string){const m=date.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)throw new Error(`Data de admissão inválida: ${date}.`);return`${m[3]}-${m[2]}-${m[1]}`;}
function value(v:number|null|undefined){if(v==null)return"";if(!Number.isFinite(v)||v<0)throw new Error("Valor de remuneração inválido.");return v.toFixed(2).replace(".",",");}
function validCompetence(c:string){return /^\d{4}-\d{2}$/.test(c)&&c<FGTS_RESCISORY_CUTOFF;}
function competenceBr(c:string){if(!validCompetence(c))throw new Error(`Competência ${c} não pode ser importada: o leiaute aceita apenas competências anteriores a março/2024.`);return`${c.slice(5,7)}-${c.slice(0,4)}`;}

export function validateFgtsRescisoryWorker(worker:FgtsRescisoryWorker){
 const errors:string[]=[];const emp=digits(worker.employerRegistration),cpf=digits(worker.workerCpf);
 if(!(/^\d{8}$/.test(emp)||/^\d{11}$/.test(emp)))errors.push("Empregador deve usar raiz CNPJ de 8 dígitos ou CPF de 11 dígitos.");
 if(!/^\d{11}$/.test(cpf))errors.push("CPF do trabalhador deve conter 11 dígitos.");
 try{dateBr(worker.admissionDate);}catch(error){errors.push(error instanceof Error?error.message:"Data inválida.");}
 if(!worker.registrationNumber&&!worker.tsveCategory)errors.push("Informe matrícula ou categoria TSVE.");
 if(worker.tsveCategory&&!/^\d{3}$/.test(worker.tsveCategory))errors.push("Categoria TSVE deve conter 3 dígitos.");
 if(!worker.remunerations.length)errors.push("Informe ao menos uma remuneração/ausência.");
 const seen=new Set<string>();for(const row of worker.remunerations){if(!validCompetence(row.competence))errors.push(`Competência ${row.competence} deve ser anterior a 2024-03.`);const hasValue=(row.principal??0)>0||(row.thirteenth??0)>0;if(hasValue&&!/^\d{3}$/.test(row.category??""))errors.push(`${row.competence}: categoria de 3 dígitos é obrigatória quando há remuneração.`);if(!hasValue&&row.category)errors.push(`${row.competence}: categoria deve ficar vazia quando não há principal nem 13º.`);if(!hasValue&&!row.absence)errors.push(`${row.competence}: informe remuneração ou ausência de base FGTS.`);if(row.principal!=null&&(!Number.isFinite(row.principal)||row.principal<0))errors.push(`${row.competence}: valor principal inválido.`);if(row.thirteenth!=null&&(!Number.isFinite(row.thirteenth)||row.thirteenth<0))errors.push(`${row.competence}: valor de 13º inválido.`);const key=`${row.competence}|${row.category??""}`;if(seen.has(key))errors.push(`${row.competence}: competência/categoria repetida; consolide a última informação antes de exportar.`);seen.add(key);}
 return{valid:errors.length===0,errors};
}

export function renderFgtsRescisoryFile(workers:FgtsRescisoryWorker[]){
 if(!workers.length)throw new Error("Informe ao menos um trabalhador.");const employer=digits(workers[0].employerRegistration);const lines:string[]=[];
 for(const worker of workers){const validation=validateFgtsRescisoryWorker(worker);if(!validation.valid)throw new Error(validation.errors.join(" "));if(digits(worker.employerRegistration)!==employer)throw new Error("Todos os trabalhadores do arquivo devem pertencer ao mesmo empregador.");lines.push(["1",employer,digits(worker.workerCpf),dateBr(worker.admissionDate),worker.registrationNumber??"",worker.tsveCategory??""].join(";"));for(const r of worker.remunerations.sort((a,b)=>a.competence.localeCompare(b.competence))){const hasValue=(r.principal??0)>0||(r.thirteenth??0)>0;lines.push(["2",competenceBr(r.competence),hasValue?(r.category??""):"",value(r.principal),value(r.thirteenth),r.absence?"S":""].join(";"));}}
 if(lines.length>5000)throw new Error("Arquivo excede o limite oficial de 5.000 linhas.");const content=`${lines.join("\n")}\n`;if(Buffer.byteLength(content,"utf8")>130*1024)throw new Error("Arquivo excede o limite oficial de 130 KB.");return content;
}
