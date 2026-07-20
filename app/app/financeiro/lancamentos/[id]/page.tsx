import Link from "next/link";
import { notFound } from "next/navigation";
import { decideFinanceApproval, submitFinanceEntry } from "@/app/actions/operational-finance";
import { SettlementForm } from "@/components/finance/settlement-form";
import { requireCapability } from "@/lib/authorization";
import { formatMoney } from "@/lib/financial/cash-flow";

export const dynamic = "force-dynamic";

type FinanceAttachmentSummary = { id: string; file_name: string };
type FinanceSettlementSummary = {
  id: string;
  settled_at: string;
  amount: number | string;
  method: string;
  reference: string | null;
  finance_attachments: FinanceAttachmentSummary[] | null;
};
type FinanceInstallmentSummary = {
  id: string;
  installment_number: number;
  due_date: string;
  status: string;
  notes: string;
  settled_amount: number | string;
  balance: number | string;
  finance_settlements: FinanceSettlementSummary[] | null;
};

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

export default async function FinanceEntryDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const context = await requireCapability("financeiro", "read");
  const { data: entry, error } = await context.supabase
    .from("finance_entries")
    .select("*,projects(name,code),clients(legal_name,trade_name),procurement_suppliers(legal_name,trade_name),finance_categories(name,code),finance_cost_centers(name,code)")
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .single();
  if (error || !entry) notFound();

  const [{ data: rawInstallments }, { data: approvals }, { data: cashAccounts }, { data: events }] = await Promise.all([
    context.supabase.from("finance_installments").select("*,finance_settlements(*,finance_attachments(id,file_name))").eq("entry_id", id).order("installment_number"),
    context.supabase.from("finance_approvals").select("*").eq("entry_id", id).order("requested_at", { ascending: false }),
    context.supabase.from("finance_cash_accounts").select("id,name").eq("organization_id", context.organizationId).eq("active", true).order("name"),
    context.supabase.from("finance_events").select("id,event_type,metadata,created_at").eq("entry_id", id).order("created_at", { ascending: false }).limit(20)
  ]);

  const installments = (rawInstallments ?? []) as unknown as FinanceInstallmentSummary[];
  const project = first(entry.projects);
  const client = first(entry.clients);
  const supplier = first(entry.procurement_suppliers);
  const category = first(entry.finance_categories);
  const costCenter = first(entry.finance_cost_centers);
  const scheduled = installments.reduce((sum, item) => sum + Number(item.balance) + Number(item.settled_amount), 0);
  const settled = installments.reduce((sum, item) => sum + Number(item.settled_amount), 0);
  const balance = installments.reduce((sum, item) => sum + Number(item.balance), 0);
  const pending = (approvals ?? []).find(item => item.status === "PENDING");

  return <main className="content finance-app">
    <Link className="back-link" href="/app/financeiro/lancamentos">← Lançamentos</Link>
    <section className="page-heading">
      <div><span className="badge">{entry.code} · {entry.direction === "RECEIVABLE" ? "A RECEBER" : "A PAGAR"}</span><h1>{entry.description}</h1><p>{project ? `${project.code} · ${project.name}` : "Sem obra específica"} · {entry.document_number || "sem documento"}</p></div>
      <div><span className="badge">{entry.status}</span><h2>{formatMoney(Number(entry.total_amount), entry.currency)}</h2></div>
    </section>
    {query.error && <div className="validation blocking">{query.error}</div>}

    <section className="stats-grid">
      <article className="card"><small>TOTAL</small><strong>{formatMoney(Number(entry.total_amount))}</strong><span>{entry.source_type}</span></article>
      <article className="card"><small>PROGRAMADO</small><strong>{formatMoney(scheduled)}</strong><span>{installments.length} parcela(s)</span></article>
      <article className="card"><small>LIQUIDADO</small><strong>{formatMoney(settled)}</strong><span>realizado</span></article>
      <article className="card"><small>SALDO</small><strong>{formatMoney(balance)}</strong><span>em aberto</span></article>
    </section>

    <div className="finance-two-column"><section>
      <article className="card card-pad">
        <div className="section-heading"><div><span className="eyebrow">PARCELAS</span><h2>Cronograma financeiro</h2></div>{entry.status === "DRAFT" && <form action={submitFinanceEntry}><input type="hidden" name="entryId" value={id}/><button className="button button-primary">Enviar para aprovação</button></form>}</div>
        <div className="finance-installments">{installments.map(installment => <article className="finance-installment-row" key={installment.id}>
          <div><strong>{installment.installment_number}ª · {new Date(`${installment.due_date}T12:00:00`).toLocaleDateString("pt-BR")}</strong><small>{installment.status} · {installment.notes || "sem observações"}</small></div>
          <div><span>{formatMoney(Number(installment.settled_amount))} pago</span><strong>{formatMoney(Number(installment.balance))} em aberto</strong></div>
          {Number(installment.balance) > 0 && ["APPROVED", "PARTIALLY_SETTLED", "OVERDUE"].includes(entry.status) && <details><summary className="button button-secondary">Registrar baixa</summary><SettlementForm entryId={id} installmentId={installment.id} balance={Number(installment.balance)} cashAccounts={cashAccounts ?? []}/></details>}
          <div className="finance-settlement-history">{(installment.finance_settlements ?? []).map((settlement: FinanceSettlementSummary) => <div key={settlement.id}>
            <span>{new Date(settlement.settled_at).toLocaleString("pt-BR")}</span><strong>{formatMoney(Number(settlement.amount))}</strong><small>{settlement.method} · {settlement.reference || "sem referência"}</small>
            {(settlement.finance_attachments ?? []).map((attachment: FinanceAttachmentSummary) => <Link className="text-link" href={`/api/financeiro/anexos/${attachment.id}`} key={attachment.id}>Abrir {attachment.file_name}</Link>)}
          </div>)}</div>
        </article>)}</div>
      </article>
      <article className="card card-pad"><span className="eyebrow">EVENTOS</span><h2>Histórico auditável</h2><div className="finance-list">{(events ?? []).map(event => <div className="finance-row" key={event.id}><div><strong>{event.event_type}</strong><small>{new Date(event.created_at).toLocaleString("pt-BR")}</small></div></div>)}</div></article>
    </section><aside>
      {pending && <form action={decideFinanceApproval} className="card card-pad"><input type="hidden" name="entryId" value={id}/><input type="hidden" name="approvalId" value={pending.id}/><span className="eyebrow">APROVAÇÃO FINANCEIRA</span><h2>{formatMoney(Number(pending.amount))}</h2><label>Parecer<textarea name="comment" rows={4}/></label><div className="page-actions"><button className="button button-secondary" name="decision" value="REJECTED">Rejeitar</button><button className="button button-primary" name="decision" value="APPROVED">Aprovar</button></div></form>}
      <section className="card card-pad"><span className="eyebrow">CLASSIFICAÇÃO</span><dl className="detail-list"><div><dt>Cliente/Fornecedor</dt><dd>{client?.trade_name || client?.legal_name || supplier?.trade_name || supplier?.legal_name || "—"}</dd></div><div><dt>Categoria</dt><dd>{category ? `${category.code} · ${category.name}` : "—"}</dd></div><div><dt>Centro de custo</dt><dd>{costCenter ? `${costCenter.code} · ${costCenter.name}` : "—"}</dd></div><div><dt>Emissão</dt><dd>{new Date(`${entry.issue_date}T12:00:00`).toLocaleDateString("pt-BR")}</dd></div><div><dt>Competência</dt><dd>{entry.competence_date ? new Date(`${entry.competence_date}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</dd></div></dl></section>
    </aside></div>
  </main>;
}
