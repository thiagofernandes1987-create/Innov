import { createProjectFromContract } from "@/app/actions/projects";
import { ProjectEntryForm } from "@/components/obras/project-entry-form";
import { requireOrganizationContext } from "@/lib/auth";
import { singleRelation } from "@/lib/supabase/relations";

export default async function NewProjectPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: pageError } = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext([
    "SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "GESTOR_OBRAS", "ENGENHEIRO"
  ]);

  const [{ data: contracts, error }, { data: clients }, { data: memberships }] = await Promise.all([
    supabase
      .from("contracts")
      .select("id,code,title,status,starts_at,ends_at,project_id,clients(legal_name,trade_name)")
      .eq("organization_id", organizationId)
      .in("status", ["SIGNED", "ACTIVE", "AMENDED"])
      .is("project_id", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id,legal_name,trade_name")
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .order("legal_name"),
    supabase
      .from("organization_memberships")
      .select("user_id,role")
      .eq("organization_id", organizationId)
      .eq("active", true)
  ]);

  const userIds = [...new Set((memberships ?? []).map((membership) => membership.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds)
    : { data: [] };

  const clientOptions = (clients ?? []).map((client) => ({
    id: client.id,
    label: client.trade_name || client.legal_name
  }));
  const managerOptions = (profiles ?? []).map((profile) => ({
    id: profile.id,
    label: profile.full_name || profile.email || profile.id.slice(0, 8)
  }));

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <h1>Nova obra ou projeto</h1>
          <p className="muted">Comece diretamente no Planejamento ou preserve a rastreabilidade de um contrato já assinado.</p>
        </div>
      </div>

      {pageError ? <div className="validation blocking" role="alert">{pageError}</div> : null}
      {error ? <div className="validation blocking" role="alert">{error.message}</div> : null}

      <div className="project-entry-layout">
        <section>
          <div className="section-heading">
            <div><span className="eyebrow">ENTRADA LIVRE</span><h2>Projeto independente ou obra existente</h2></div>
          </div>
          <ProjectEntryForm clients={clientOptions} managers={managerOptions} />
        </section>

        <section>
          <div className="section-heading">
            <div><span className="eyebrow">CONTRATO → OBRA</span><h2>Converter contrato assinado</h2></div>
          </div>
          <form action={createProjectFromContract} className="card card-pad field-form">
            <label>Contrato assinado ou ativo
              <select name="contractId" required defaultValue="">
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
            <div className="validation">Somente contratos assinados, ativos ou aditados e ainda sem obra vinculada aparecem nesta lista.</div>
            <button className="button button-primary" type="submit">Criar obra pelo contrato</button>
          </form>
        </section>
      </div>
    </main>
  );
}
