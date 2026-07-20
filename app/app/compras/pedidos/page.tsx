import Link from "next/link";
import {requireCapability} from "@/lib/authorization";
import {formatCurrency} from "@/lib/procurement/comparison";

export const dynamic="force-dynamic";

export default async function ProcurementOrdersPage(){
  const context=await requireCapability("compras","read");
  const{data}=await context.supabase.from("procurement_orders").select("id,code,status,total,expected_at,created_at,projects(name),procurement_suppliers(legal_name,trade_name),procurement_order_items(ordered_quantity,received_quantity)").eq("organization_id",context.organizationId).order("created_at",{ascending:false});
  return <main className="content procurement-app"><section className="page-heading"><div><span className="badge">COMPRAS</span><h1>Pedidos</h1><p>Ordens aprovadas, saldos pendentes e recebimentos vinculados à qualidade.</p></div></section><section className="card card-pad procurement-table-wrap"><table className="data-table"><thead><tr><th>Pedido</th><th>Fornecedor</th><th>Obra</th><th>Entrega</th><th>Valor</th><th>Status</th></tr></thead><tbody>{(data??[]).map(order=>{const supplier=Array.isArray(order.procurement_suppliers)?order.procurement_suppliers[0]:order.procurement_suppliers;const project=Array.isArray(order.projects)?order.projects[0]:order.projects;return <tr key={order.id}><td><Link className="text-link" href={`/app/compras/pedidos/${order.id}`}>{order.code}</Link></td><td>{supplier?.trade_name||supplier?.legal_name||"—"}</td><td>{project?.name??"—"}</td><td>{order.expected_at?new Date(`${order.expected_at}T12:00:00`).toLocaleDateString("pt-BR"):"—"}</td><td>{formatCurrency(Number(order.total))}</td><td><span className="badge">{order.status}</span></td></tr>})}</tbody></table>{!data?.length&&<div className="empty-state"><h3>Nenhum pedido emitido</h3><p>Um pedido será gerado automaticamente após a aprovação de uma cotação.</p></div>}</section></main>;
}
