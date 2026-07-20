import Link from "next/link";
import { requireCapability } from "@/lib/authorization";
import { formatMoney } from "@/lib/financial/cash-flow";

export const dynamic = "force-dynamic";

export default async function FinanceEntriesPage() {
  const context = await requireCapability("financeiro", "read");
  const [{ data: entries }, { data: balances }] = await Promise.all([
    context.supabase
      .from("finance_entries")
      .select("id,code,description,direction,status,total_amount,issue_date,document_number,projects(name),clients(legal_name,trade_name),procurement_suppliers(legal_name,trade_name)")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false }),
    context.supabase
      .from("finance_entry_balances_v")
      .select("id,balance,settled_amount")
      .eq("organization_id", context.organizationId)
  ]);
  const balanceByEntry = new Map((balances ?? []).map(item => [item.id, item]));

  return <main className="content finance-app">
    <section className="page-heading"><div><span className="badge">FINANCEIRO</span><h1>Lançamentos</h1><p>Contas a pagar e receber com parcelas, aprovações e liquidações.</p></div><Link className="button button-primary" href="/app/financeiro/lancamentos/novo">Novo lançamento</Link></section>
    <section className="card card-pad finance-table-wrap"><table className="data-table"><thead><tr><th>Código</th><th>Descrição</th><th>Parte</th><th>Obra</th><th>Emissão</th><th>Total</th><th>Saldo</th><th>Status</th></tr></thead><tbody>{(entries ?? []).map(item => {
      const project = Array.isArray(item.projects) ? item.projects[0] : item.projects;
      const client = Array.isArray(item.clients) ? item.clients[0] : item.clients;
      const supplier = Array.isArray(item.procurement_suppliers) ? item.procurement_suppliers[0] : item.procurement_suppliers;
      const balance = balanceByEntry.get(item.id);
      return <tr key={item.id}><td><Link className="text-link" href={`/app/financeiro/lancamentos/${item.id}`}>{item.code}</Link></td><td><strong>{item.description}</strong><small>{item.direction === "RECEIVABLE" ? "A receber" : "A pagar"}</small></td><td>{client?.trade_name || client?.legal_name || supplier?.trade_name || supplier?.legal_name || "—"}</td><td>{project?.name ?? "—"}</td><td>{new Date(`${item.issue_date}T12:00:00`).toLocaleDateString("pt-BR")}</td><td>{formatMoney(Number(item.total_amount))}</td><td>{formatMoney(Number(balance?.balance ?? item.total_amount))}</td><td><span className="badge">{item.status}</span></td></tr>;
    })}</tbody></table>{!entries?.length && <div className="empty-state"><h3>Nenhum lançamento financeiro</h3><p>Crie manualmente ou importe um contrato ou pedido de compra.</p></div>}</section>
  </main>;
}
