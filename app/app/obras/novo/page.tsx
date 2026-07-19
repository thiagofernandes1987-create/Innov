import { createProjectFromContract } from "@/app/actions/projects";
import { requireOrganizationContext } from "@/lib/auth";
import { singleRelation } from "@/lib/supabase/relations";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: pageError } = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext([
    "SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "GESTOR_OBRAS"
  ]);
  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("id,code,title,status,starts_at,ends_at,project_id,clients(legal_name,trade_name)")
    .eq("organization_id", organizationId)
    .in("status", ["SIGNED", "ACTIVE", "AMENDED"])
    .is("project_id", null)
    .order("updated_at", { ascending: false });

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">CONTRATO → OBRA</span>
          <h1>Nova obra</h1>
          <p className="muted">A obra herda organização, cliente e vínculo contratual, preservando a rastreabilidade.</p>
        </div>
      </div>

      {pageError ? <div className="validation blocking" role="alert">{pageError}</div> : null}
      {error ? <div className="validation blocking" role="alert">{error.message}</div> : null}

      <section className="card card-pad" style={{ maxWidth: 820 }}>
        <form action={createProjectFromContract} className="field-form">
          <label>
            Contrato assinado ou ativo
            <select name="contractId" required>
              <option value="">Selecione</option>
              {(contracts ?? []).map((contract) => {
                const client = singleRelation(contract.clients);
                return (
                  <option key={contract.id} value={contract.id}>
                    {contract.code} · {client?.trade_name || client?.legal_name || contract.title}
                  </option>
                );
              })}
            </select>
          </label>

          <div className="field-grid">
            <label>Código da obra<input name="code" placeholder="OBR-2026-001" required /></label>
            <label>Nome da obra<input name="name" placeholder="Residência Alto Capivari" required /></label>
            <label>Início planejado<input type="date" name="plannedStart" required /></label>
            <label>Término planejado<input type="date" name="plannedEnd" required /></label>
            <label className="span-2">Endereço<input name="addressLine" placeholder="Rua, número e complemento" /></label>
            <label>Cidade<input name="city" defaultValue="Campos do Jordão" /></label>
            <label>Estado<input name="state" defaultValue="SP" maxLength={2} /></label>
          </div>

          <div className="validation">
            Somente contratos com estado <strong>assinado, ativo ou aditado</strong> e ainda sem obra vinculada aparecem nesta lista.
          </div>
          <button className="button button-primary" type="submit">Criar obra e iniciar planejamento</button>
        </form>
      </section>
    </main>
  );
}
