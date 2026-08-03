import { createAmendment } from "@/app/actions/commercial-documents";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { requireCapability } from "@/lib/authorization";
import { formatCurrency } from "@/lib/domain";
import { singleRelation } from "@/lib/supabase/relations";

export default async function NewAmendmentPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const context = await requireCapability("aditivos", "create");
  const [{ data: contracts }, { data: budgetVersions }] = await Promise.all([
    context.supabase
      .from("contracts")
      .select("id,code,title,status,consolidated_value,clients(legal_name)")
      .eq("organization_id", context.organizationId)
      .not("status", "in", "(COMPLETED,TERMINATED,CANCELED)")
      .order("updated_at", { ascending: false }),
    context.supabase
      .from("budget_versions")
      .select("id,version_number,budgets!budget_versions_budget_id_fkey(code,title)")
      .eq("organization_id", context.organizationId)
      .eq("status", "APPROVED")
      .order("approved_at", { ascending: false })
  ]);

  return (
    <main className="content">
      <BarraDeTrabalho
        title="Novo aditivo"
        primaryAction={<button className="button button-primary" type="submit" form="amendment-form">Criar aditivo</button>}
      />
      <p className="workspace-intro">
        Registre motivo, impacto de escopo, valor e prazo antes de executar a mudança. O contrato original permanece imutável.
      </p>
      {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}
      <form id="amendment-form" action={createAmendment} className="card card-pad field-form">
        <div className="field-grid">
          <label className="span-2">Contrato
            <select name="contractId" required defaultValue="">
              <option value="" disabled>Selecione o contrato afetado</option>
              {(contracts ?? []).map(contract => {
                const client = singleRelation(contract.clients);
                return (
                  <option key={contract.id} value={contract.id}>
                    {contract.code} · {client?.legal_name ?? contract.title} · {formatCurrency(Number(contract.consolidated_value))}
                  </option>
                );
              })}
            </select>
          </label>
          <label>Código<input name="code" required placeholder="AD-2026-001" /></label>
          <label>Orçamento de apoio
            <select name="budgetVersionId">
              <option value="">Sem orçamento vinculado</option>
              {(budgetVersions ?? []).map(version => {
                const budget = singleRelation(version.budgets);
                return <option key={version.id} value={version.id}>{budget?.code} · V{version.version_number} · {budget?.title}</option>;
              })}
            </select>
          </label>
          <label className="span-2">Motivo<textarea name="reason" required rows={3} /></label>
          <label className="span-2">Alteração de escopo<textarea name="scopeDelta" rows={6} /></label>
          <label>Variação de valor<input name="valueDelta" inputMode="decimal" defaultValue="0" /></label>
          <label>Variação de prazo em dias<input name="daysDelta" type="number" defaultValue="0" /></label>
          <label>Nova data final<input name="newEndDate" type="date" /></label>
        </div>
      </form>
    </main>
  );
}
