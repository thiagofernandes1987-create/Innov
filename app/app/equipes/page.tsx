import Link from "next/link";
import { requireOrganizationContext } from "@/lib/auth";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { singleRelation } from "@/lib/supabase/relations";

export default async function AllTeamsPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const [teamsResult, resourcesResult] = await Promise.all([
    supabase
      .from("project_teams")
      .select("id,project_id,name,specialty,active,projects(code,name),project_team_members(count)")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("project_resources")
      .select("id,resource_type,active")
      .eq("organization_id", organizationId)
  ]);

  reportDataAccessError("all-teams.teams", teamsResult.error);
  reportDataAccessError("all-teams.resources", resourcesResult.error);

  const teamsLoadFailed = Boolean(teamsResult.error);
  const resourcesLoadFailed = Boolean(resourcesResult.error);
  const loadFailed = teamsLoadFailed || resourcesLoadFailed;
  const teams = teamsResult.data ?? [];
  const resources = resourcesResult.data ?? [];
  const activeTeams = teams.filter((team) => team.active).length;
  const activeResources = resources.filter((resource) => resource.active).length;
  const labor = resources.filter((resource) => resource.resource_type === "LABOR").length;
  const equipment = resources.filter((resource) => resource.resource_type === "EQUIPMENT").length;

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">RECURSOS</span>
          <h1>Equipes</h1>
          <p className="muted">Equipes e recursos cadastrados nas obras ativas.</p>
        </div>
      </div>

      {loadFailed ? <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div> : null}

      {!teamsLoadFailed || !resourcesLoadFailed ? (
        <section className="grid grid-kpi">
          {!teamsLoadFailed ? <article className="card kpi"><small>EQUIPES ATIVAS</small><strong>{activeTeams}</strong></article> : null}
          {!resourcesLoadFailed ? <article className="card kpi"><small>RECURSOS ATIVOS</small><strong>{activeResources}</strong></article> : null}
          {!resourcesLoadFailed ? <article className="card kpi"><small>MÃO DE OBRA</small><strong>{labor}</strong></article> : null}
          {!resourcesLoadFailed ? <article className="card kpi"><small>EQUIPAMENTOS</small><strong>{equipment}</strong></article> : null}
        </section>
      ) : null}

      {!teamsLoadFailed ? (
        <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", marginTop: 22 }}>
          {teams.map((team) => {
            const project = singleRelation(team.projects);
            const count = Array.isArray(team.project_team_members) ? Number(team.project_team_members[0]?.count ?? 0) : 0;
            return (
              <article className="card card-pad" key={team.id}>
                <span className="badge">{project?.code || "OBRA"}</span>
                <h2 style={{ marginTop: 10 }}>{team.name}</h2>
                <p className="muted">{team.specialty || "Sem especialidade"}</p>
                <p><strong>{count}</strong> integrante(s)</p>
                <Link className="button button-secondary" href={`/app/obras/${team.project_id}/equipes`}>Abrir obra</Link>
              </article>
            );
          })}
          {!teams.length ? <article className="card card-pad"><strong>Nenhuma equipe cadastrada.</strong></article> : null}
        </section>
      ) : (
        <section className="card card-pad" style={{ marginTop: 22 }}><strong>Equipes temporariamente indisponíveis.</strong><p className="muted">Recarregue a tela antes de concluir que não há equipes alocadas.</p></section>
      )}

      {resourcesLoadFailed && !teamsLoadFailed ? (
        <section className="card card-pad" style={{ marginTop: 22 }}><strong>Indicadores de recursos indisponíveis.</strong><p className="muted">As equipes confirmadas permanecem visíveis, mas os totais de mão de obra e equipamentos não devem ser usados nesta consulta.</p></section>
      ) : null}
    </main>
  );
}
