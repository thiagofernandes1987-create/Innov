import {
  desativarResponsabilidadeOperacional,
  salvarResponsabilidadeOperacional
} from "@/app/actions/operations";
import Link from "next/link";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { requireAccessAdministration } from "@/lib/authorization";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { PERSONAS_OPERACIONAIS } from "@/lib/personas/runtime";

export default async function OperationalResponsibilitiesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireAccessAdministration();
  const params = await searchParams;
  const [membershipsResult, projectsResult, responsibilitiesResult] = await Promise.all([
    context.supabase
      .from("organization_memberships")
      .select("user_id,role")
      .eq("organization_id", context.organizationId)
      .eq("active", true),
    context.supabase
      .from("projects")
      .select("id,name,status")
      .eq("organization_id", context.organizationId)
      .order("name"),
    context.supabase
      .from("operational_responsibilities")
      .select("id,project_id,persona_id,user_id,quiet_from,quiet_until,timezone,assigned_at")
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("assigned_at", { ascending: false })
  ]);
  const firstError = membershipsResult.error ?? projectsResult.error ?? responsibilitiesResult.error;
  if (firstError) {
    reportDataAccessError("operational-responsibilities.load", firstError);
    throw new Error(DATA_LOAD_ERROR_MESSAGE);
  }

  const memberships = membershipsResult.data ?? [];
  const projects = projectsResult.data ?? [];
  const responsibilities = responsibilitiesResult.data ?? [];
  const userIds = memberships.map(item => item.user_id);
  const profilesResult = userIds.length
    ? await context.supabase
        .from("profiles")
        .select("id,email,full_name")
        .in("id", userIds)
    : { data: [], error: null };
  if (profilesResult.error) {
    reportDataAccessError("operational-responsibilities.profiles", profilesResult.error);
    throw new Error(DATA_LOAD_ERROR_MESSAGE);
  }

  const profileById = new Map((profilesResult.data ?? []).map(item => [item.id, item]));
  const projectById = new Map(projects.map(item => [item.id, item]));
  const personaById = new Map(PERSONAS_OPERACIONAIS.map(item => [item.id, item]));

  return (
    <main className="content">
      <BarraDeTrabalho
        title="Responsabilidades operacionais"
        meta={<span className="pipeline-contagem">{responsibilities.length} ativa(s)</span>}
        controls={
          <Link className="button button-secondary" href="/app/administracao">
            Voltar à administração
          </Link>
        }
      />
      <p className="workspace-intro">
        Associe profissionais reais à organização ou a uma obra. Eventos
        pessimistas usam esta matriz para formar a caixa de cada área.
      </p>

      {params.error && <p className="alert alert-danger">{params.error}</p>}

      <section className="card card-pad">
        <div className="section-heading">
          <div>
            <span className="eyebrow">NOVA ATRIBUIÇÃO</span>
            <h2>Responsável por profissão</h2>
          </div>
        </div>
        <form action={salvarResponsabilidadeOperacional} className="responsibility-form">
          <label>
            Profissional
            <select name="userId" required>
              <option value="">Selecione</option>
              {memberships.map(member => {
                const profile = profileById.get(member.user_id);
                return (
                  <option key={member.user_id} value={member.user_id}>
                    {profile?.full_name || profile?.email || member.user_id.slice(0, 8)}
                    {" · "}
                    {member.role}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            Cadeira profissional
            <select name="personaId" required>
              <option value="">Selecione</option>
              {PERSONAS_OPERACIONAIS.map(persona => (
                <option key={persona.id} value={persona.id}>
                  {persona.id} · {persona.role}
                </option>
              ))}
            </select>
          </label>
          <label>
            Escopo
            <select name="projectId" defaultValue="">
              <option value="">Toda a organização</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name} · {project.status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Silêncio a partir de
            <input name="quietFrom" type="time" />
          </label>
          <label>
            Silêncio até
            <input name="quietUntil" type="time" />
          </label>
          <label>
            Fuso horário
            <input name="timezone" defaultValue="America/Sao_Paulo" />
          </label>
          <button className="button button-primary" type="submit">
            Salvar responsabilidade
          </button>
        </form>
      </section>

      <section className="card card-pad">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MATRIZ ATIVA</span>
            <h2>{responsibilities.length} atribuição(ões)</h2>
          </div>
        </div>
        {responsibilities.length ? (
          <div className="observability-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Cadeira</th>
                  <th>Escopo</th>
                  <th>Janela silenciosa</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {responsibilities.map(item => {
                  const profile = profileById.get(item.user_id);
                  const persona = personaById.get(item.persona_id);
                  const project = item.project_id ? projectById.get(item.project_id) : null;
                  return (
                    <tr key={item.id}>
                      <td>
                        {profile?.full_name || profile?.email || item.user_id.slice(0, 8)}
                        <small>{profile?.email}</small>
                      </td>
                      <td>
                        <strong>{persona?.role ?? item.persona_id}</strong>
                        <small>{persona?.profession}</small>
                      </td>
                      <td>{project?.name ?? "Toda a organização"}</td>
                      <td>
                        {item.quiet_from && item.quiet_until
                          ? `${String(item.quiet_from).slice(0, 5)}–${String(item.quiet_until).slice(0, 5)}`
                          : "Sem bloqueio"}
                        <small>{item.timezone}</small>
                      </td>
                      <td>
                        <form action={desativarResponsabilidadeOperacional}>
                          <input type="hidden" name="responsibilityId" value={item.id} />
                          <button className="button button-secondary" type="submit">
                            Desativar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3>Nenhum responsável atribuído</h3>
            <p>Cadastre ao menos quem origina e quem recebe a primeira exceção testada.</p>
          </div>
        )}
      </section>
    </main>
  );
}
