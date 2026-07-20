import Link from "next/link";
import {requireCapability} from "@/lib/authorization";
import {formatCurrency} from "@/lib/procurement/comparison";

export const dynamic="force-dynamic";

export default async function ProcurementDashboard(){
  const context=await requireCapability("compras","read");
  const[{count:requests},{count:approvals},{count:orders},{count:receipts},{data:recent}]=await Promise.all([
    context.supabase.from("procurement_requests").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId).in("status",["SUBMITTED","IN_QUOTATION","UNDER_APPROVAL"]),
    context.supabase.from("procurement_approvals").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId).eq("status","PENDING"),
    context.supabase.from("procurement_orders").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId).in("status",["ISSUED","PARTIALLY_RECEIVED"]),
    context.supabase.from("procurement_receipts").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId),
    context.supabase.from("procurement_requests").select("id,code,title,status,priority,needed_by,projects(name),procurement_orders(total)").eq("organization_id",context.organizationId).order("created_at",{ascending:false}).limit(8)
  ]);
  return <main className="content procurement-app">
    <section className="page-heading"><div><span className="badge">APLICATIVO · SUPRIMENTOS</span><h1>Compras e Suprimentos</h1><p>Solicitações por obra, fornecedores convidados, cotações, aprovações, pedidos e recebimentos integrados à FVM.</p></div><div className="page-actions"><Link className="button button-secondary" href="/app/compras/fornecedores">Fornecedores</Link><Link className="button button-primary" href="/app/compras/solicitacoes/nova">Nova solicitação</Link></div></section>
    <section className="stats-grid"><article className="card"><small>EM COTAÇÃO</small><strong>{requests??0}</strong><span>solicitações em andamento</span></article><article className="card"><small>PARA APROVAR</small><strong>{approvals??0}</strong><span>mapas comparativos</span></article><article className="card"><small>PEDIDOS ABERTOS</small><strong>{orders??0}</strong><span>aguardando recebimento</span></article><article className="card"><small>RECEBIMENTOS</small><strong>{receipts??0}</strong><span>com rastreio e FVM</span></article></section>
    <section className="procurement-launch-grid"><Link className="card card-pad procurement-launch" href="/app/compras/solicitacoes"><span>☷</span><div><h2>Solicitações e cotações</h2><p>Organize a demanda da obra e compare propostas recebidas.</p></div></Link><Link className="card card-pad procurement-launch" href="/app/compras/pedidos"><span>▤</span><div><h2>Pedidos e recebimentos</h2><p>Acompanhe saldo, entrega parcial e inspeção de materiais.</p></div></Link><Link className="card card-pad procurement-launch" href="/app/compras/fornecedores"><span>◎</span><div><h2>Fornecedores convidados</h2><p>Cadastro interno e acesso seguro somente por convite.</p></div></Link></section>
    <section className="card card-pad"><div className="section-heading"><div><span className="eyebrow">ATIVIDADE RECENTE</span><h2>Solicitações</h2></div><Link className="text-link" href="/app/compras/solicitacoes">Ver todas →</Link></div><div className="procurement-list">{(recent??[]).map(item=>{const project=Array.isArray(item.projects)?item.projects[0]:item.projects;const order=Array.isArray(item.procurement_orders)?item.procurement_orders[0]:item.procurement_orders;return <Link className="procurement-row" href={`/app/compras/solicitacoes/${item.id}`} key={item.id}><div><strong>{item.code} · {item.title}</strong><small>{project?.name??"Obra"} · necessidade {item.needed_by?new Date(`${item.needed_by}T12:00:00`).toLocaleDateString("pt-BR"):"não definida"}</small></div><div><span className="badge">{item.status}</span><strong>{order?.total==null?"—":formatCurrency(Number(order.total))}</strong></div></Link>})}{!recent?.length&&<div className="empty-state"><h3>Nenhuma solicitação</h3><p>Crie a primeira demanda de compra vinculada a uma obra.</p></div>}</div></section>
  </main>;
}
