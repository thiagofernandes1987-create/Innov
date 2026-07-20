import Link from "next/link";
import {requireCapability} from "@/lib/authorization";

export const dynamic="force-dynamic";

export default async function ProcurementRequestsPage(){
  const context=await requireCapability("compras","read");
  const{data}=await context.supabase.from("procurement_requests").select("id,code,title,status,priority,needed_by,created_at,projects(name),procurement_request_items(count),procurement_orders(code,status,total)").eq("organization_id",context.organizationId).order("created_at",{ascending:false});
  return <main className="content procurement-app"><section className="page-heading"><div><span className="badge">COMPRAS</span><h1>Solicitações</h1><p>Demandas de materiais e serviços organizadas por obra.</p></div><Link className="button button-primary" href="/app/compras/solicitacoes/nova">Nova solicitação</Link></section><section className="card card-pad procurement-table-wrap"><table className="data-table"><thead><tr><th>Código</th><th>Solicitação</th><th>Obra</th><th>Prioridade</th><th>Necessidade</th><th>Status</th></tr></thead><tbody>{(data??[]).map(item=>{const project=Array.isArray(item.projects)?item.projects[0]:item.projects;return <tr key={item.id}><td><Link className="text-link" href={`/app/compras/solicitacoes/${item.id}`}>{item.code}</Link></td><td><strong>{item.title}</strong></td><td>{project?.name??"—"}</td><td>{item.priority}</td><td>{item.needed_by?new Date(`${item.needed_by}T12:00:00`).toLocaleDateString("pt-BR"):"—"}</td><td><span className="badge">{item.status}</span></td></tr>})}</tbody></table>{!data?.length&&<div className="empty-state"><h3>Nenhuma solicitação cadastrada</h3><p>Crie uma demanda vinculada a uma obra para iniciar uma cotação.</p></div>}</section></main>;
}
