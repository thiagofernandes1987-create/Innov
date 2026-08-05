import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { ProposalForm } from "@/components/propostas/proposal-form";
import { requireCapability } from "@/lib/authorization";
import { formatCurrency } from "@/lib/domain";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { singleRelation } from "@/lib/supabase/relations";

const proposalBudgetStatusLabels: Record<string, string> = {
  TECHNICAL_REVIEW: "Revisão técnica",
  FINANCIAL_REVIEW: "Revisão financeira",
  APPROVAL_PENDING: "Em aprovação",
  APPROVED: "Aprovado"
};

const budgetVersionSelect = "id,version_number,sale_price,status,frozen_at,budgets!inner(code,title,status,clients(legal_name,trade_name))";

export default async function NewProposalPage() {
  const context = await requireCapability("propostas", "create");

  const [readyVersionsResult, reviewVersionsResult, clientsResult] = await Promise.all([
    context.supabase
      .from("budget_versions")
      .select("id,version_number,sale_price,status,frozen_at,budgets!budget_versions_budget_id_fkey!inner(code,title,status,clients(legal_name,trade_name))")
      .eq("organization_id", context.organizationId)
      .in("status", ["APPROVAL_PENDING", "APPROVED"])
      .gt("sale_price", 0)
      .order("created_at", { ascending: false }),
    context.supabase
      .from("budget_versions")
      .select(budgetVersionSelect)
      .eq("organization_id", context.organizationId)
      .in("status", ["TECHNICAL_REVIEW", "FINANCIAL_REVIEW"])
      .gt("sale_price", 0)
      .order("created_at", { ascending: false }),
    context.supabase
      .from("clients")
      .select("id,legal_name,trade_name,city")
      .eq("organization_id", context.organizationId)
      .is("archived_at", null)
      .order("legal_name")
  ]);

  reportDataAccessError("new-proposal.ready-budget-versions", readyVersionsResult.error);
  reportDataAccessError("new-proposal.review-budget-versions", reviewVersionsResult.error);
  reportDataAccessError("new-proposal.clients", clientsResult.error);

  const versionsById = new Map(
    [...(readyVersionsResult.data ?? []), ...(reviewVersionsResult.data ?? [])]
      .map(version => [version.id, version] as const)
  );

  const budgetOptions = [...versionsById.values()].map((version) => {
    const budget = singleRelation(version.budgets);
    const client = singleRelation(budget?.clients);
    const approved = version.status === "APPROVED";
    const state = proposalBudgetStatusLabels[version.status] ?? version.status;
    return {
      id: version.id,
      price: Number(version.sale_price),
      status: version.status,
      approved,
      label: `${budget?.code ?? "ORÇ"} · V${version.version_number} · ${client?.trade_name || client?.legal_name || "Cliente"} · ${formatCurrency(Number(version.sale_price))} · ${state}${version.frozen_at ? " · congelado" : " · calculado"}`
    };
  });

  const clientOptions = (clientsResult.data ?? []).map((client) => ({
    id: client.id,
    label: client.trade_name || client.legal_name,
    city: client.city
  }));

  const dependencyFailed = Boolean(readyVersionsResult.error || reviewVersionsResult.error || clientsResult.error);

  return (
    <main className="content">
      <BarraDeTrabalho title="Nova proposta" />
      <p className="workspace-intro">
        Crie uma proposta a partir de orçamento calculado, em revisão, aprovação ou aprovado; também é possível definir um valor fixo. Descontos acima de 7% entram automaticamente na alçada da diretoria.
      </p>
      {dependencyFailed ? (
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
      ) : null}
      <ProposalForm budgets={budgetOptions} clients={clientOptions} />
    </main>
  );
}
