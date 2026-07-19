import { notFound } from "next/navigation";
import { calculateBudgetVersion, decideBudgetApproval, freezeBudgetVersion } from "@/app/actions/budgets";
import { requireOrganizationContext } from "@/lib/auth";
import { budgetStatusLabels, formatCurrency, formatPercent, type BudgetStatus } from "@/lib/domain";

type BudgetDetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function BudgetDetailPage({ params, searchParams }: BudgetDetailProps) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext();

  const { data: budget } = await supabase
    .from("budgets")
    .select("id, code, title, status, valid_until, client_id, current_version_id, clients(legal_name)")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (!budget || !budget.current_version_id) notFound();

  const [{ data: version }, { data: items }, { data: validations }, { data: approvals }] = await Promise.all([
    supabase.from("budget_versions").select("*").eq("id", budget.current_version_id).single(),
    supabase.from("budget_items").select("id, code, description, unit, quantity, unit_cost, loss_rate, freight_rate, cost_type").eq("budget_version_id", budget.current_version_id).order("sequence"),
    supabase.from("budget_validation_results").select("id, code, severity, message, field_name, resolved_at").eq("budget_version_id", budget.current_version_id).order("created_at"),
    supabase.from("budget_approvals").select("id, approval_type, status, requested_by, approver_id, requires_aal2, reason, created_at").eq("budget_version_id", budget.current_version_id).order("created_at")
  ]);

  if (!version) notFound();

  const baseCost = Number(version.direct_cost) + Number(version.indirect_cost) + Number(version.fixed_cost) + Number(version.administrative_fee);
  const client = budget.clients as { legal_name?: string } | null;

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">{budget.code} · V{version.version_number}</span>
          <h1>{budget.title}</h1>
          <p className="muted">{client?.legal_name ?? "Cliente não identificado"} · {budgetStatusLabels[budget.status as BudgetStatus] ?? budget.status}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <form action={calculateBudgetVersion}>
            <input type="hidden" name="budgetId" value={budget.id} />
            <input type="hidden" name="versionId" value={version.id} />
            <button className="button button-secondary" type="submit" disabled={Boolean(version.frozen_at)}>Recalcular</button>
          </form>
          <form action={freezeBudgetVersion}>
            <input type="hidden" name="budgetId" value={budget.id} />
            <input type="hidden" name="versionId" value={version.id} />
            <button className="button button-primary" type="submit" disabled={Boolean(version.frozen_at)}>Congelar e solicitar aprovação</button>
          </form>
        </div>
      </div>

      {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}

      <div className="financial-grid">
        <div className="grid">
          <section className="card">
            <div className="card-pad">
              <h2>Estrutura de custos</h2>
              <p className="muted">Itens que formam a versão atual. Versões congeladas são imutáveis.</p>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Item</th><th>Tipo</th><th>Un.</th><th>Qtd.</th><th>Custo unit.</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {(items ?? []).map((item) => {
                    const subtotal = Number(item.quantity) * Number(item.unit_cost) * (1 + Number(item.loss_rate) + Number(item.freight_rate));
                    return (
                      <tr key={item.id}>
                        <td><strong>{item.code ?? "—"}</strong><br /><span className="muted">{item.description}</span></td>
                        <td><span className="badge">{item.cost_type}</span></td>
                        <td>{item.unit}</td>
                        <td className="mono">{Number(item.quantity).toLocaleString("pt-BR")}</td>
                        <td className="mono">{formatCurrency(Number(item.unit_cost))}</td>
                        <td className="mono">{formatCurrency(subtotal)}</td>
                      </tr>
                    );
                  })}
                  {!items?.length ? <tr><td colSpan={6}>Nenhum item cadastrado nesta versão.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card card-pad">
            <h2>Validações</h2>
            <p className="muted">Bloqueios impedem aprovação até correção ou justificativa por alçada.</p>
            {(validations ?? []).map((validation) => (
              <div key={validation.id} className={`validation ${validation.severity === "BLOCKING" ? "blocking" : ""}`}>
                <strong>{validation.code}</strong> · {validation.message}
                {validation.resolved_at ? <span className="badge badge-success" style={{ marginLeft: 8 }}>Resolvido</span> : null}
              </div>
            ))}
            {!validations?.length ? <div className="validation">Nenhuma inconsistência registrada. Execute o cálculo para atualizar as regras.</div> : null}
          </section>

          <section className="card card-pad">
            <h2>Aprovações e alçadas</h2>
            <p className="muted">Exceções críticas exigem MFA AAL2 e separação entre solicitante e aprovador.</p>
            <div className="grid">
              {(approvals ?? []).map((approval) => (
                <article key={approval.id} className="card card-pad">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                    <div>
                      <strong>{approval.approval_type}</strong>
                      <p className="muted">{approval.requires_aal2 ? "MFA AAL2 obrigatório" : "Aprovação padrão"}</p>
                    </div>
                    <span className={approval.status === "APPROVED" ? "badge badge-success" : approval.status === "REJECTED" ? "badge badge-danger" : "badge badge-warning"}>{approval.status}</span>
                  </div>
                  {approval.status === "PENDING" ? (
                    <form action={decideBudgetApproval} style={{ display: "grid", gap: 10 }}>
                      <input type="hidden" name="approvalId" value={approval.id} />
                      <input type="hidden" name="budgetId" value={budget.id} />
                      <label>Justificativa<input name="reason" required /></label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="button button-primary" name="decision" value="APPROVED">Aprovar</button>
                        <button className="button button-secondary" name="decision" value="REJECTED">Rejeitar</button>
                      </div>
                    </form>
                  ) : <p>{approval.reason ?? "Sem comentário."}</p>}
                </article>
              ))}
              {!approvals?.length ? <p className="muted">Nenhuma aprovação solicitada.</p> : null}
            </div>
          </section>
        </div>

        <aside className="financial-rail" aria-label="Resumo financeiro interno">
          <small>RESUMO FINANCEIRO INTERNO</small>
          <div className="financial-row"><span>Custos diretos</span><strong className="mono">{formatCurrency(Number(version.direct_cost))}</strong></div>
          <div className="financial-row"><span>Custos indiretos</span><strong className="mono">{formatCurrency(Number(version.indirect_cost))}</strong></div>
          <div className="financial-row"><span>Custos fixos</span><strong className="mono">{formatCurrency(Number(version.fixed_cost))}</strong></div>
          <div className="financial-row"><span>Taxa administrativa</span><strong className="mono">{formatCurrency(Number(version.administrative_fee))}</strong></div>
          <div className="financial-row"><span>Custo-base</span><strong className="mono">{formatCurrency(baseCost)}</strong></div>
          <div className="financial-row"><span>BDI</span><strong className="mono">{formatPercent(Number(version.bdi_rate))}</strong></div>
          <div className="financial-row"><span>Markup</span><strong className="mono">{Number(version.markup_factor).toFixed(4)}</strong></div>
          <div className="financial-total"><small>PREÇO DE VENDA</small><strong>{formatCurrency(Number(version.sale_price))}</strong></div>
          <div className="financial-row"><span>Margem</span><strong className="mono">{formatPercent(Number(version.gross_margin_rate))}</strong></div>
          <div className="financial-row"><span>Lucro estimado</span><strong className="mono">{formatCurrency(Number(version.estimated_profit))}</strong></div>
          <div className="financial-row"><span>ROI</span><strong className="mono">{version.estimated_roi_rate == null ? "—" : formatPercent(Number(version.estimated_roi_rate))}</strong></div>
          <div className="financial-row"><span>Payback</span><strong className="mono">{version.payback_month ? `Mês ${version.payback_month}` : "—"}</strong></div>
          <p style={{ color: "rgba(255,255,255,.58)", fontSize: 12 }}>
            Estes dados nunca são enviados ao portal do cliente.
          </p>
        </aside>
      </div>
    </main>
  );
}
