import Link from"next/link";
import{requireCapability}from"@/lib/authorization";
import{formatMoney}from"@/lib/financial/cash-flow";

export const dynamic="force-dynamic";
export default async function RhPeoplePage(){
 const context=await requireCapability("rh","read");
 const{data,error}=await context.supabase.from("rh_workers").select("id,worker_code,status,rh_people(full_name,preferred_name,cpf,email,phone),rh_employments(id,registration_number,employment_type,admission_date,status,base_salary)").eq("organization_id",context.organizationId).order("created_at",{ascending:false});
 if(error)throw new Error(error.message);
 return <main className="content"><section className="page-heading"><div><span className="badge">RH · PESSOAS</span><h1>Empregados e trabalhadores</h1><p>Cadastro canônico de pessoa, trabalhador e vínculo.</p></div><div className="page-actions"><Link className="button button-primary" href="/app/rh/pessoas/novo">Novo empregado</Link></div></section><section className="card" style={{overflowX:"auto"}}><table className="data-table"><thead><tr><th>Nome</th><th>Código</th><th>Matrícula</th><th>Admissão</th><th>Salário base</th><th>Status</th></tr></thead><tbody>{(data??[]).map(row=>{const person=Array.isArray(row.rh_people)?row.rh_people[0]:row.rh_people;const employment=Array.isArray(row.rh_employments)?row.rh_employments[0]:row.rh_employments;return <tr key={row.id}><td><Link className="text-link" href={`/app/rh/pessoas/${row.id}`}><strong>{person?.preferred_name||person?.full_name||"Sem nome"}</strong></Link><small style={{display:"block"}}>{person?.email||"—"}</small></td><td>{row.worker_code}</td><td>{employment?.registration_number||"—"}</td><td>{employment?.admission_date||"—"}</td><td>{formatMoney(Number(employment?.base_salary??0))}</td><td><span className="badge">{employment?.status||row.status}</span></td></tr>})}{!data?.length?<tr><td colSpan={6}><div className="empty-state"><h3>Nenhum trabalhador cadastrado</h3><p>Cadastre o primeiro empregado para iniciar a operação do RH.</p></div></td></tr>:null}</tbody></table></section></main>;
}
