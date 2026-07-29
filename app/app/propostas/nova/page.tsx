import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { ProposalForm } from "@/components/propostas/proposal-form";
import { requireCapability } from "@/lib/authorization";
import { formatCurrency } from "@/lib/domain";
import { singleRelation } from "@/lib/supabase/relations";

export default async function NewProposalPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const context = await requireCapability("propostas", "create");

  const [{ data: versions }, { data: clients }] = await Promise.all([
    context.supabase
      .from("budget_versions")
      .select("id,version_number,sale_price,status,frozen_at,budgets!inner(code,title,status,clients(legal_name,trade_name))")
      .eq("organization_id", context.organizationId)
      .in("status", ["APPROVAL_PENDING", "APPROVED"])
      .not("frozen_at", "is", null)
      .gt("sale_price", 0)
      .order("created_at", { ascending: false }),
    context.supabase
      .from("clients")
      .select("id,legal_name,trade_name,city")
      .eq("organization_id", context.organizationId)
      .is("archived_at", null)
      .order("legal_name")
  ]);

  const budgetOptions = (versions ?? []).map((version) => {
    const budget = singleRelation(version.budgets);
    const client = singleRelation(budget?.clients);
    const approved = version.status === "APPROVED";
    return {
      id: version.id,
      price: Number(version.sale_price),
      status: version.status,
      approved,
      label: `${budget?.code ?? "ORÇ"} · V${version.version_number} · ${client?.trade_name || client?.legal_name || "Cliente"} · ${formatCurrency(Number(version.sale_price))} · ${approved ? "Aprovado" : "Em aprovação"}`
    };
  });

  const clientOptions = (clients ?? []).map((client) => ({
    id: client.id,
    label: client.trade_name || client.legal_name,
    city: client.city
  }));

  return (
    <main className="content">
      <BarraDeTrabalho title="Nova proposta" />
      <p className="workspace-intro">
        Crie uma proposta a partir de orçamento calculado ou defina um valor fixo. Descontos acima de 7% entram automaticamente na alçada da diretoria.
      </p>
      {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}
      <ProposalForm budgets={budgetOptions} clients={clientOptions} />
    </main>
  );
}
