import Link from "next/link";
import { requireOrganizationContext } from "@/lib/auth";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { formatDate, formatPercent, statusBadge } from "@/lib/stage12";
import { singleRelation } from "@/lib/supabase/relations";

export default async function ProjectsPage() {
  const { supabase, organizationId } = await requireOrganizationContext();
  const projectsResult = await supabase
    .from("projects")
    // `contracts!projects_contract_id_fkey` não é preciosismo de sintaxe.
    // Existem dois caminhos entre obra e contrato — `projects.contract_id` e
    // `contracts.project_id` — e o PostgREST se recusa a escolher (PGRST201).
    // Sem nomear a chave, a tela devolvia erro de carga e listava zero obras
    // com duas cadastradas no banco.
    .select("id,code,name,status,planned_start,planned_end,actual_start,progress,city,state,client_released_at,clients(legal_name,trade_name),contracts!projects_contract_id_fkey(code,status)")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  reportDataAccessError("projects.collection", projectsResult.error);
  const loadFailed = Boolean(projectsResult.error);
  const projects = (projectsResult.data ?? []).map((project) => ({
    ...project,
    client: singleRelation(project.clients),
    contract: singleRelation(project.contracts)
  }));
  const active = projects.filter((project) => ["ACTIVE", "IN_PROGRESS"].includes(project.status)).length;
  const planning = projects.filter((project) => project.status === "PLANNING").length;
  const average = projects.length
    ? projects.reduce((total, project) => total + Number(project.progress ?? 0), 0) / projects.length
    : 0;
  const delayed = projects.filter((project) => project.planned_end && new Date(`${project.planned_end}T23:59:59`) < new Date() && Number(project.progress) < 1).length;

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">GESTÃO MULTIOBRA</span>
          <h1>Obras</h1>
          <p className="muted">Planejamento, execução de campo, documentos e comunicação com o cliente.</p>
        </div>
        <Link className="button button-primary" href="/app/obras/novo">Nova obra</Link>
      </div>

      {loadFailed ? <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div> : null}

      <section className="grid grid-kpi">
        <article className="card kpi"><small>OBRAS ATIVAS</small><strong>{active}</strong></article>
        <article className="card kpi"><small>EM PLANEJAMENTO</small><strong>{planning}</strong></article>
        <article className="card kpi"><small>PROGRESSO MÉDIO</small><strong>{formatPercent(average)}</strong></article>
        <article className="card kpi"><small>COM ALERTA DE PRAZO</small><strong>{delayed}</strong></article>
      </section>

      <section className="card table-wrap" style={{ marginTop: 22 }}>
        <table>
          <thead>
            <tr><th>Obra</th><th>Cliente</th><th>Status</th><th>Progresso</th><th>Período</th><th>Local</th><th>Portal</th></tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>
                  <Link href={`/app/obras/${project.id}`}><strong>{project.code}</strong><br /><span className="muted">{project.name}</span></Link>
                </td>
                <td>{project.client?.trade_name || project.client?.legal_name || "—"}</td>
                <td><span className={statusBadge(project.status)}>{project.status}</span></td>
                <td style={{ minWidth: 170 }}>
                  <div className="progress-row">
                    <div><span>{formatPercent(project.progress)}</span></div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: formatPercent(project.progress) }} /></div>
                  </div>
                </td>
                <td>{formatDate(project.planned_start)} → {formatDate(project.planned_end)}</td>
                <td>{[project.city, project.state].filter(Boolean).join(" / ") || "—"}</td>
                <td>{project.client_released_at ? <span className="badge badge-success">Liberada</span> : <span className="badge">Interna</span>}</td>
              </tr>
            ))}
            {!projects.length && !loadFailed ? (
              <tr><td colSpan={7}><div className="card-pad"><strong>Nenhuma obra cadastrada.</strong><p className="muted">Crie a primeira obra a partir de um contrato assinado ou por entrada independente.</p></div></td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
