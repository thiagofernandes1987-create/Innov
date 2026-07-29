import Link from "next/link";
import { createNextBudgetVersion } from "@/app/actions/budget-versions";
import { requireOrganizationContext } from "@/lib/auth";
import { budgetStatusLabels, formatCurrency, formatPercent, type BudgetStatus } from "@/lib/domain";
import { singleRelation, type SupabaseRelation } from "@/lib/supabase/relations";

type BudgetVersionSummary = {
  version_number: number;
  scenario_type: string;
  sale_price: number;
  gross_margin_rate: number;
  estimated_roi_rate: number | null;
  frozen_at: string | null;
};

type BudgetRow = {
  id: string;
  code: string;
  title: string;
  status: BudgetStatus;
  valid_until: string | null;
  clients: SupabaseRelation<{ legal_name: string }>;
  budget_versions: SupabaseRelation<BudgetVersionSummary>;
};

export default async function BudgetsPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("budgets")
    .select(`
      id, code, title, status, valid_until, updated_at,
      clients(legal_name),
      budget_versions!budgets_current_version_fk(
        version_number, scenario_type, sale_price, gross_margin_rate,
        estimated_roi_rate, frozen_at
      )
    `)
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  const budgets = ((data ?? []) as unknown as BudgetRow[]).map((budget) => ({
    ...budget,
    client: singleRelation(budget.clients),
    currentVersion: singleRelation(budget.budget_versions)
  }));

  const total = budgets.reduce((sum, item) => sum + Number(item.currentVersion?.sale_price ?? 0), 0);
  const pending = budgets.filter((item) => item.status === "APPROVAL_PENDING").length;
  const approved = budgets.filter((item) => ["APPROVED", "CLIENT_SENT", "ACCEPTED", "CONTRACTED"].includes(item.status)).length;
  const averageMargin = budgets.length
    ? budgets.reduce((sum, item) => sum + Number(item.currentVersion?.gross_margin_rate ?? 0), 0) / budgets.length
    : 0;

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">ETAPA 9</span>
          <h1>Orçamentos</h1>
          <p className="muted">Versões, composições, impostos, margens, alçadas e propostas.</p>
        </div>
        <Link className="button button-primary" href="/app/orcamentos/novo">Novo orçamento</Link>
      </div>

      {error ? <div className="validation blocking" role="alert">{error.message}</div> : null}

      <section className="grid grid-kpi" aria-label="Indicadores de orçamento">
        <article className="card kpi"><small>CARTEIRA</small><strong>{formatCurrency(total)}</strong></article>
        <article className="card kpi"><small>APROVAÇÃO PENDENTE</small><strong>{pending}</strong></article>
        <article className="card kpi"><small>APROVADOS/CONTRATADOS</small><strong>{approved}</strong></article>
        <article className="card kpi"><small>MARGEM MÉDIA</small><strong>{formatPercent(averageMargin)}</strong></article>
      </section>

      <section className="card" style={{ marginTop: 22 }}>
        <div className="card-pad">
          <h2>Carteira de orçamentos</h2>
          <p className="muted">Versões congeladas permanecem imutáveis; use “Criar nova versão” para continuar a composição.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th><th>Cliente</th><th>Status</th><th>Versão</th>
                <th>Preço</th><th>Margem</th><th>ROI</th><th>Validade</th><th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((budget) => (
                <tr key={budget.id}>
                  <td><Link href={`/app/orcamentos/${budget.id}`}><strong>{budget.code}</strong><br /><span className="muted">{budget.title}</span></Link></td>
                  <td>{budget.client?.legal_name ?? "—"}</td>
                  <td><span className={budget.status === "APPROVAL_PENDING" ? "badge badge-warning" : "badge"}>{budgetStatusLabels[budget.status] ?? budget.status}</span></td>
                  <td className="mono">V{budget.currentVersion?.version_number ?? "—"}</td>
                  <td className="mono">{formatCurrency(Number(budget.currentVersion?.sale_price ?? 0))}</td>
                  <td className="mono">{formatPercent(Number(budget.currentVersion?.gross_margin_rate ?? 0))}</td>
                  <td className="mono">{budget.currentVersion?.estimated_roi_rate == null ? "—" : formatPercent(Number(budget.currentVersion.estimated_roi_rate))}</td>
                  <td>{budget.valid_until ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${budget.valid_until}T12:00:00`)) : "—"}</td>
                  <td>
                    {budget.currentVersion?.frozen_at ? (
                      <form action={createNextBudgetVersion} style={{ display: "grid", gap: 8, minWidth: 190 }}>
                        <input type="hidden" name="budgetId" value={budget.id} />
                        <input type="hidden" name="changeSummary" value="Continuidade da composição em nova versão" />
                        <button className="button button-primary" type="submit">Criar nova versão</button>
                      </form>
                    ) : (
                      <Link className="button button-secondary" href={`/app/orcamentos/${budget.id}`}>Compor custos</Link>
                    )}
                  </td>
                </tr>
              ))}
              {!budgets.length ? (
                <tr><td colSpan={9}><div className="card-pad"><strong>Nenhum orçamento cadastrado.</strong><p className="muted">Crie o primeiro orçamento para iniciar a carteira.</p></div></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
