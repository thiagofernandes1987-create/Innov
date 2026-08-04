import { ContractProjectForm } from "@/components/obras/contract-project-form";
import { ProjectEntryForm } from "@/components/obras/project-entry-form";
import { requireOrganizationContext } from "@/lib/auth";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { singleRelation } from "@/lib/supabase/relations";

const MANAGEMENT_ROLES = [
  "SUPER_ADMIN",
  "DIRECAO",
  "ADMINISTRADOR",
  "GESTOR_OBRAS",
  "ENGENHEIRO"
] as const;

export default async function NewProjectPage() {
  const { supabase, organizationId } = await requireOrganizationContext(MANAGEMENT_ROLES);

  const [contractsResult, clientsResult, membershipsResult] = await Promise.all([
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
      .in("role", [...MANAGEMENT_ROLES])
  ]);

  reportDataAccessError("new-project.contracts", contractsResult.error);
  reportDataAccessError("new-project.clients", clientsResult.error);
  reportDataAccessError("new-project.memberships", membershipsResult.error);

  const userIds = [...new Set((membershipsResult.data ?? []).map((membership) => membership.user_id))];
  const profilesResult = userIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds)
    : { data: [], error: null };

  reportDataAccessError("new-project.profiles", profilesResult.error);

  const clientsAvailable = !clientsResult.error;
  const managersAvailable = !membershipsResult.error && !profilesResult.error;
  const contractsAvailable = !contractsResult.error;

  const clientOptions = clientsAvailable
    ? (clientsResult.data ?? []).map((client) => ({
        id: client.id,
        label: client.trade_name || client.legal_name
      }))
    : [];

  const managerOptions = managersAvailable
    ? (profilesResult.data ?? []).map((profile) => ({
        id: profile.id,
        label: profile.full_name || profile.email || profile.id.slice(0, 8)
      }))
    : [];

  const contractOptions = contractsAvailable
    ? (contractsResult.data ?? []).map((contract) => {
        const client = singleRelation(contract.clients);
        return {
          id: contract.id,
          label: `${contract.code} · ${client?.trade_name || client?.legal_name || contract.title}`
        };
      })
    : [];

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <h1>Nova obra ou projeto</h1>
          <p className="muted">Comece diretamente no Planejamento ou preserve a rastreabilidade de um contrato já assinado.</p>
        </div>
      </div>

      {!clientsAvailable || !managersAvailable || !contractsAvailable ? (
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
      ) : null}

      <div className="project-entry-layout">
        <section>
          <div className="section-heading">
            <div><span className="eyebrow">ENTRADA LIVRE</span><h2>Projeto independente ou obra existente</h2></div>
          </div>
          <ProjectEntryForm
            clients={clientOptions}
            managers={managerOptions}
            clientsAvailable={clientsAvailable}
            managersAvailable={managersAvailable}
          />
        </section>

        <section>
          <div className="section-heading">
            <div><span className="eyebrow">CONTRATO → OBRA</span><h2>Converter contrato assinado</h2></div>
          </div>
          {contractsAvailable ? (
            <ContractProjectForm contracts={contractOptions} />
          ) : (
            <section className="card card-pad">
              <strong>Contratos temporariamente indisponíveis.</strong>
              <p className="muted">A entrada livre continua disponível. Recarregue a página antes de concluir que não há contratos para conversão.</p>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
