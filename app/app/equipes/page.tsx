import Link from "next/link";
import { requireOrganizationContext } from "@/lib/auth";
import { singleRelation } from "@/lib/supabase/relations";

export default async function AllTeamsPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const [{ data: teams, error }, { data: resources }] = await Promise.all([
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

  const activeTeams = (teams ?? []).filter((team) => team.active).length;
  const activeResources = (resources ?? []).filter((resource) => resource.active).length;
  const labor = (resources ?? []).filter((resource) => resource.resource_type === "LABOR").length;
  const equipment = (resources ?? []).filter((resource) => resource.resource_type === "EQUIPMENT").length;

  return (
    <main className="content">
      <div className="page-head"><div><span className="badge">RECURSOS</span><h1>Equipes</h1><p className="muted">Equipes e recursos cadastrados nas obras ativas.</p></div></div>
      {error ? <div className="validation blocking">{error.message}</div> : null}
      <section className="grid grid-kpi"><article className="card kpi"><small>EQUIPES ATIVAS</small><strong>{activeTeams}</strong></article><article className="card kpi"><small>RECURSOS ATIVOS</small><strong>{activeResources}</strong></article><article className="card kpi"><small>MÃO DE OBRA</small><strong>{labor}</strong></article><article className="card kpi"><small>EQUIPAMENTOS</small><strong>{equipment}</strong></article></section>
      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", marginTop: 22 }}>
        {(teams ?? []).map((team) => {
          const project = singleRelation(team.projects);
          const count = Array.isArray(team.project_team_members) ? Number(team.project_team_members[0]?.count ?? 0) : 0;
          return <article className="card card-pad" key={team.id}><span className="badge">{project?.code || "OBRA"}</span><h2 style={{ marginTop: 10 }}>{team.name}</h2><p className="muted">{team.specialty || "Sem especialidade"}</p><p><strong>{count}</strong> integrante(s)</p><Link className="button button-secondary" href={`/app/obras/${team.project_id}/equipes`}>Abrir obra</Link></article>;
        })}
        {!teams?.length ? <article className="card card-pad"><strong>Nenhuma equipe cadastrada.</strong></article> : null}
      </section>
    </main>
  );
}
