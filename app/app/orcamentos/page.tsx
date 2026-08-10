import Link from "next/link";
import { createNextBudgetVersion } from "@/app/actions/budget-versions";
import { SmartSearchBar } from "@/components/busca/smart-search-bar";
import { requireOrganizationContext } from "@/lib/auth";
import { budgetStatusLabels, formatCurrency, formatPercent, type BudgetStatus } from "@/lib/domain";
import { reportDataAccessError } from "@/lib/errors/data-access";
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
  clients: SupabaseRelation<{ legal_name: string; trade_name?: string | null; city?: string | null; email?: string | null; phone?: string | null }>;
  budget_versions: SupabaseRelation<BudgetVersionSummary>;
};

function numberParam(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function BudgetsPage({
  searchParams
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    client?: string;
    minPrice?: string;
    maxPrice?: string;
    minMargin?: string;
  }>;
}) {
  const query = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext();
  const { data, error } = await supabase
    .from("budgets")
    .select(`
      id, code, title, status, valid_until, updated_at,
      clients(legal_name,trade_name,city,email,phone),
      budget_versions!budgets_current_version_fk(
        version_number, scenario_type, sale_price, gross_margin_rate,
        estimated_roi_rate, frozen_at
      )
    `)
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (error) reportDataAccessError("budgets.page.load", error);

  const normalizedQuery = String(query.q ?? "").trim().toLocaleLowerCase("pt-BR");
  const clientQuery = String(query.client ?? "").trim().toLocaleLowerCase("pt-BR");
  const minPrice = numberParam(query.minPrice);
  const maxPrice = numberParam(query.maxPrice);
  const minMargin = numberParam(query.minMargin);

  const budgets = ((data ?? []) as unknown as BudgetRow[]).map((budget) => ({
    ...budget,
    client: singleRelation(budget.clients),
    currentVersion: singleRelation(budget.budget_versions)
  })).filter((budget) => {
    const price = Number(budget.currentVersion?.sale_price ?? 0);
    const marginPercent = Number(budget.currentVersion?.gross_margin_rate ?? 0) * 100;
    const searchable = [
      budget.code,
      budget.title,
      budget.client?.legal_name,
      budget.client?.trade_name,
      budget.client?.city,
      budget.client?.email,
      budget.client?.phone
    ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
    const clientText = [budget.client?.legal_name, budget.client?.trade_name]
      .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");

    if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
    if (query.status && budget.status !== query.status) return false;
    if (clientQuery && !clientText.includes(clientQuery)) return false;
    if (minPrice !== null && price < minPrice) return false;
    if (maxPrice !== null && price > maxPrice) return false;
    if (minMargin !== null && marginPercent < minMargin) return false;
    return true;
  });

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
          <h1>Orçamentos</h1>
          <p className="muted">Versões, composições, impostos, margens, alçadas e propostas.</p>
        </div>
        <Link className="button button-primary" href="/app/orcamentos/novo">Novo orçamento</Link>
      </div>

      <SmartSearchBar
        initialQuery={query.q}
        initialFilters={query}
        placeholder="Buscar código, orçamento, cliente, contato, e-mail, telefone ou cidade..."
        filters={[
          {
            name: "status",
            label: "Situação",
            type: "select",
            options: [
              { value: "DRAFT", label: "Rascunho" },
              { value: "CALCULATING", label: "Em cálculo" },
              { value: "APPROVAL_PENDING", label: "Aprovação pendente" },
              { value: "APPROVED", label: "Aprovado" },
              { value: "CLIENT_SENT", label: "Enviado ao cliente" },
              { value: "ACCEPTED", label: "Aceito" },
              { value: "CONTRACTED", label: "Contratado" }
            ]
          },
          { name: "client", label: "Cliente", placeholder: "Construtora ou pessoa" },
          { name: "minPrice", label: "Valor mínimo", placeholder: "500000" },
          { name: "maxPrice", label: "Valor máximo", placeholder: "2000000" },
          { name: "minMargin", label: "Margem mínima (%)", placeholder: "15" }
        ]}
      />

      {error ? <div className="validation blocking" role="alert">Não foi possível carregar os orçamentos.</div> : null}

      <section className="grid grid-kpi" aria-label="Indicadores de orçamento" style={{ marginTop: 18 }}>
        <article className="card kpi"><small>CARTEIRA FILTRADA</small><strong>{formatCurrency(total)}</strong></article>
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
                  <td>{budget.client?.trade_name || budget.client?.legal_name || "—"}<br /><small className="muted">{budget.client?.city || budget.client?.email || "—"}</small></td>
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
                <tr><td colSpan={9}><div className="card-pad"><strong>Nenhum orçamento encontrado.</strong><p className="muted">Revise os filtros ou crie o primeiro orçamento.</p></div></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
