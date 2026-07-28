import { createContractFromProposal } from "@/app/actions/commercial-documents";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { requireCapability } from "@/lib/authorization";
import { formatCurrency } from "@/lib/domain";
import { singleRelation } from "@/lib/supabase/relations";

export default async function NewContractPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const context = await requireCapability("contratos", "create");
  const [{ data: proposals }, { data: templates }] = await Promise.all([
    context.supabase
      .from("proposals")
      .select("id,code,valid_until,clients(legal_name),proposal_versions!proposals_current_version_fk(id,title,sale_price)")
      .eq("organization_id", context.organizationId)
      .eq("status", "ACCEPTED")
      .order("updated_at", { ascending: false }),
    context.supabase
      .from("contract_templates")
      .select("id,name,version_number")
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("name")
  ]);

  return (
    <main className="content">
      <BarraDeTrabalho
        title="Novo contrato"
        primaryAction={<button className="button button-primary" type="submit" form="contract-form">Gerar contrato</button>}
      />
      <p className="workspace-intro">
        Somente propostas formalmente aceitas podem virar contrato. A conversão preserva preço, origem e trilha de auditoria.
      </p>
      {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}
      <form id="contract-form" action={createContractFromProposal} className="card card-pad field-form">
        <div className="field-grid">
          <label className="span-2">Proposta aceita
            <select name="proposalVersionId" required defaultValue="">
              <option value="" disabled>Selecione uma proposta aceita</option>
              {(proposals ?? []).map(proposal => {
                const version = singleRelation(proposal.proposal_versions);
                const client = singleRelation(proposal.clients);
                return version ? (
                  <option key={proposal.id} value={version.id}>
                    {proposal.code} · {client?.legal_name ?? "Cliente"} · {formatCurrency(Number(version.sale_price))}
                  </option>
                ) : null;
              })}
            </select>
          </label>
          <label>Código<input name="code" required placeholder="CT-2026-001" /></label>
          <label>Modelo
            <select name="templateId">
              <option value="">Sem modelo vinculado</option>
              {(templates ?? []).map(template => (
                <option key={template.id} value={template.id}>{template.name} · V{template.version_number}</option>
              ))}
            </select>
          </label>
          <label className="span-2">Título<input name="title" required placeholder="Contrato de execução e fornecimento" /></label>
          <label className="span-2">Corpo contratual
            <textarea name="renderedBody" required rows={18} placeholder="Texto integral que será versionado antes da assinatura." />
          </label>
        </div>
      </form>
    </main>
  );
}
