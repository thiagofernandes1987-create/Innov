import { notFound } from "next/navigation";
import { createProjectResource, createTeam } from "@/app/actions/projects";
import { ProjectNav } from "@/components/project-nav";
import { requireOrganizationContext } from "@/lib/auth";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";

export default async function TeamsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: pageError } = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext();
  const [projectResult, teamsResult, resourcesResult, membershipsResult] = await Promise.all([
    supabase.from("projects").select("id,code,name").eq("id", id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("project_teams").select("id,name,specialty,leader_user_id,active,project_team_members(id,display_name,role_label,active)").eq("project_id", id).order("name"),
    supabase.from("project_resources").select("id,resource_type,code,name,unit,hourly_cost,daily_cost,active").eq("project_id", id).order("resource_type").order("name"),
    supabase.from("project_memberships").select("user_id,role,profiles(full_name)").eq("project_id", id).eq("active", true)
  ]);

  reportDataAccessError("project-teams.project", projectResult.error);
  reportDataAccessError("project-teams.collection", teamsResult.error);
  reportDataAccessError("project-teams.resources", resourcesResult.error);
  reportDataAccessError("project-teams.memberships", membershipsResult.error);

  if (projectResult.error) {
    return (
      <main className="content">
        <ProjectNav projectId={id} />
        <h1>Equipes e recursos</h1>
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
      </main>
    );
  }

  const project = projectResult.data;
  if (!project) notFound();

  const teams = teamsResult.data ?? [];
  const resources = resourcesResult.data ?? [];
  const memberships = membershipsResult.data ?? [];
  const teamsLoadFailed = Boolean(teamsResult.error);
  const resourcesLoadFailed = Boolean(resourcesResult.error);
  const membershipsLoadFailed = Boolean(membershipsResult.error);
  const loadFailed = teamsLoadFailed || resourcesLoadFailed || membershipsLoadFailed;

  return (
    <main className="content">
      <ProjectNav projectId={id} />
      <div className="page-head">
        <div>
          <span className="badge">{project.code}</span>
          <h1>Equipes e recursos</h1>
          <p className="muted">Mão de obra, equipamentos, materiais e subcontratados disponíveis para o planejamento.</p>
        </div>
      </div>

      {pageError ? <div className="validation blocking" role="alert">{pageError}</div> : null}
      {loadFailed ? <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div> : null}

      {!teamsLoadFailed ? (
        <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
          {teams.map((team) => (
            <article className="card card-pad" key={team.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <div><span className="badge">EQUIPE</span><h2 style={{ marginTop: 10 }}>{team.name}</h2><p className="muted">{team.specialty || "Sem especialidade definida"}</p></div>
                <span className={team.active ? "badge badge-success" : "badge"}>{team.active ? "Ativa" : "Inativa"}</span>
              </div>
              <div style={{ marginTop: 14 }}>
                {(team.project_team_members ?? []).map((member) => <div key={member.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--border)" }}><span>{member.display_name}</span><span className="muted">{member.role_label || "Integrante"}</span></div>)}
                {!team.project_team_members?.length ? <p className="muted">Nenhum integrante cadastrado.</p> : null}
              </div>
            </article>
          ))}
          {!teams.length ? <article className="card card-pad"><strong>Nenhuma equipe cadastrada.</strong><p className="muted">Crie equipes por especialidade para organizar a alocação de campo.</p></article> : null}
        </section>
      ) : <section className="card card-pad"><strong>Equipes temporariamente indisponíveis.</strong><p className="muted">Tente recarregar a tela antes de tomar decisões de alocação.</p></section>}

      <section className="card table-wrap" style={{ marginTop: 22 }}>
        {!resourcesLoadFailed ? (
          <table>
            <thead><tr><th>Tipo</th><th>Código</th><th>Recurso</th><th>Unidade</th><th>Custo/hora</th><th>Custo/dia</th><th>Status</th></tr></thead>
            <tbody>
              {resources.map((resource) => <tr key={resource.id}><td><span className="badge">{resource.resource_type}</span></td><td className="mono">{resource.code || "—"}</td><td><strong>{resource.name}</strong></td><td>{resource.unit}</td><td className="mono">{resource.hourly_cost == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(resource.hourly_cost))}</td><td className="mono">{resource.daily_cost == null ? "—"" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(resource.daily_cost))}</td><td>{resource.active ? <span className="badge badge-success">Ativo</span> : <span className="badge">Inativo</span>}</td></tr>)}
              {!resources.length ? <tr><td colSpan={7}>Nenhum recurso cadastrado.</td></tr> : null}
            </tbody>
          </table>
        ) : <div className="card-pad"><strong>Recursos temporariamente indisponíveis.</strong><p className="muted">Custos e disponibilidade não foram carregados.</p></div>}
      </section>

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", marginTop: 22 }}>
        <article className="card card-pad">
          <h2>Nova equipe</h2>
          {!membershipsLoadFailed ? (
            <form action={createTeam} className="field-form" style={{ marginTop: 16 }}>
              <input type="hidden" name="projectId" value={id} />
              <label>Nome<input name="name" placeholder="Equipe de estrutura" required /></label>
              <label>Especialidade<input name="specialty" placeholder="Formas e armação" /></label>
              <label>Líder
                <select name="leaderUserId"><option value="">Não definido</option>{memberships.map((membership) => {
                  const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
                  return <option key={membership.user_id} value={membership.user_id}>{profile?.full_name || membership.user_id.slice(0, 8)} · {membership.role}</option>;
                })}</select>
              </label>
              <button className="button button-primary" type="submit">Criar equipe</button>
            </form>
          ) : <p className="muted">Cadastro indisponível porque os integrantes autorizados não puderam ser carregados.</p>}
        </article>

        <article className="card card-pad">
          <h2>Novo recurso</h2>
          <form action={createProjectResource} className="field-form" style={{ marginTop: 16 }}>
            <input type="hidden" name="projectId" value={id} />
            <label>Tipo<select name="resourceType" required><option value="LABOR">Mão de obra</option><option value="EQUIPMENT">Equipamento</option><option value="MATERIAL">Material</option><option value="SUBCONTRACTOR">Subcontratado</option></select></label>
            <div className="field-grid"><label>Código<input name="code" /></label><label>Unidade<input name="unit" defaultValue="un" required /></label></div>
            <label>Nome<input name="name" required /></label>
            <div className="field-grid"><label>Custo/hora<input type="number" step="0.01" name="hourlyCost" /></label><label>Custo/dia<input type="number" step="0.01" name="dailyCost" /></label></div>
            <button className="button button-primary" type="submit">Adicionar recurso</button>
          </form>
        </article>
      </section>
    </main>
  );
}
