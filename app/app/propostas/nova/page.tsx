import { createProposalFromBudget } from "@/app/actions/commercial-documents";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
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
  const { data: versions } = await context.supabase
    .from("budget_versions")
    .select("id,version_number,sale_price,approved_at,budgets!inner(code,title,status,clients(legal_name))")
    .eq("organization_id", context.organizationId)
    .eq("status", "APPROVED")
    .not("frozen_at", "is", null)
    .order("approved_at", { ascending: false });

  return (
    <main className="content">
      <BarraDeTrabalho
        title="Nova proposta"
        primaryAction={<button className="button button-primary" type="submit" form="proposal-form">Criar proposta</button>}
      />
      <p className="workspace-intro">
        A proposta nasce de uma versão aprovada do orçamento. O PDF enviado é autenticado por SHA-256 e preservado como a versão comercial emitida.
      </p>
      {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}
      <form id="proposal-form" action={createProposalFromBudget} encType="multipart/form-data" className="card card-pad field-form">
        <div className="field-grid">
          <label className="span-2">Orçamento aprovado
            <select name="budgetVersionId" required defaultValue="">
              <option value="" disabled>Selecione a versão de origem</option>
              {(versions ?? []).map(version => {
                const budget = singleRelation(version.budgets);
                const client = singleRelation(budget?.clients);
                return (
                  <option key={version.id} value={version.id}>
                    {budget?.code} · V{version.version_number} · {client?.legal_name ?? "Cliente"} · {formatCurrency(Number(version.sale_price))}
                  </option>
                );
              })}
            </select>
          </label>
          <label>Código<input name="code" required placeholder="PROP-2026-001" /></label>
          <label>Validade<input name="validUntil" type="date" /></label>
          <label className="span-2">Título<input name="title" required placeholder="Proposta comercial — Projeto executivo e fabricação" /></label>
          <label className="span-2">Objeto<textarea name="objectText" required rows={3} placeholder="O compromisso comercial que esta proposta estabelece." /></label>
          <label className="span-2">Escopo<textarea name="scopeText" required rows={5} placeholder="Entregas, limites e critérios de aceite." /></label>
          <label>Inclusões<textarea name="inclusions" rows={4} /></label>
          <label>Exclusões<textarea name="exclusions" rows={4} /></label>
          <label>Premissas<textarea name="assumptions" rows={4} /></label>
          <label>Resumo comercial<textarea name="commercialSummary" rows={4} /></label>
          <label>Condições de pagamento<textarea name="paymentTerms" rows={3} /></label>
          <label>Prazo<textarea name="deadlineText" rows={3} /></label>
          <label>Garantia<textarea name="warrantyText" rows={3} /></label>
          <label>Notas internas<textarea name="notes" rows={3} /></label>
          <label className="span-2 signature-dropzone">PDF final da proposta
            <input name="file" type="file" accept="application/pdf" required />
            <small>Somente PDF, até 20 MB. O arquivo e seu hash ficam ligados à versão.</small>
          </label>
        </div>
        <label className="checkline">
          <input name="releaseClient" type="checkbox" />
          Liberar esta versão ao portal do cliente assim que for criada
        </label>
      </form>
    </main>
  );
}
