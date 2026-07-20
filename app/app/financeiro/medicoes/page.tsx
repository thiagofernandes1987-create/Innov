import Link from"next/link";
import{requireCapability}from"@/lib/authorization";
import{formatMoney}from"@/lib/financial/cash-flow";

export const dynamic="force-dynamic";

export default async function FinanceMeasurementsPage(){
 const context=await requireCapability("financeiro","read");
 const{data}=await context.supabase.from("finance_measurements").select("id,code,status,period_start,period_end,due_date,gross_amount,retention_amount,deduction_amount,net_amount,projects(name,code),contracts(title,code)").eq("organization_id",context.organizationId).order("period_end",{ascending:false});
 return <main className="content finance-app"><section className="page-heading"><div><span className="badge">FINANCEIRO</span><h1>Medições</h1><p>Boletins executados, retenções, deduções, aprovação e geração do recebível.</p></div><Link className="button button-primary" href="/app/financeiro/medicoes/nova">Nova medição</Link></section><section className="card card-pad finance-table-wrap"><table className="data-table"><thead><tr><th>Código</th><th>Obra</th><th>Contrato</th><th>Período</th><th>Bruto</th><th>Líquido</th><th>Vencimento</th><th>Status</th></tr></thead><tbody>{(data??[]).map(item=>{const project=Array.isArray(item.projects)?item.projects[0]:item.projects;const contract=Array.isArray(item.contracts)?item.contracts[0]:item.contracts;return <tr key={item.id}><td><Link className="text-link" href={`/app/financeiro/medicoes/${item.id}`}>{item.code}</Link></td><td>{project?`${project.code} · ${project.name}`:"—"}</td><td>{contract?`${contract.code} · ${contract.title}`:"—"}</td><td>{new Date(`${item.period_start}T12:00:00`).toLocaleDateString("pt-BR")} – {new Date(`${item.period_end}T12:00:00`).toLocaleDateString("pt-BR")}</td><td>{formatMoney(Number(item.gross_amount))}</td><td>{formatMoney(Number(item.net_amount))}</td><td>{new Date(`${item.due_date}T12:00:00`).toLocaleDateString("pt-BR")}</td><td><span className="badge">{item.status}</span></td></tr>})}</tbody></table>{!data?.length&&<div className="empty-state"><h3>Nenhuma medição</h3><p>Cadastre o primeiro boletim de medição da obra.</p></div>}</section></main>;
}
