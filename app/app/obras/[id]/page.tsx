import { notFound } from "next/navigation";
import { releaseProjectToClient } from "@/app/actions/projects";
import { ProjectNav } from "@/components/project-nav";
import { requireOrganizationContext } from "@/lib/auth";
import { formatDate, formatPercent, statusBadge } from "@/lib/stage12";
import { singleRelation } from "@/lib/supabase/relations";

export default async function ProjectOverviewPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: pageError } = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext();

  const [projectResult, tasksResult, milestonesResult, logsResult, snapshotsResult, documentsResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id,code,name,status,description,address_line,city,state,planned_start,planned_end,actual_start,actual_end,progress,client_released_at,clients(legal_name,trade_name),contracts(code,status,consolidated_value)")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase.from("project_tasks").select("id,status,progress,planned_end").eq("project_id", id),
    supabase.from("project_milestones").select("id,title,planned_date,completed").eq("project_id", id).order("planned_date").limit(6),
    supabase.from("daily_logs").select("id,log_date,status,summary,client_visible").eq("project_id", id).order("log_date", { ascending: false }).limit(5),
    supabase.from("project_progress_snapshots").select("snapshot_date,planned_progress,actual_progress").eq("project_id", id).order("snapshot_date", { ascending: false }).limit(8),
    supabase.from("project_documents").select("id,status,client_visible").eq("project_id", id)
  ]);

  if (!projectResult.data) notFound();
  const project = {
    ...projectResult.data,
    client: singleRelation(projectResult.data.clients),
    contract: singleRelation(projectResult.data.contracts)
  };
  const tasks = tasksResult.data ?? [];
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;
  const blocked = tasks.filter((task) => task.status === "BLOCKED").length;
  const overdue = tasks.filter((task) => task.planned_end && new Date(`${task.planned_end}T23:59:59`) < new Date() && task.status !== "COMPLETED").length;
  const releasedDocs = (documentsResult.data ?? []).filter((document) => document.client_visible && document.status === "RELEASED").length;
  const latestSnapshot = snapshotsResult.data?.[0];

  return (
    <main className="content">
      <ProjectNav projectId={id} />
      {pageError ? <div className="validation blocking" role="alert">{pageError}</div> : null}

      <section className="project-hero">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 22, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <span className="badge">{project.code}</span>
            <h1 style={{ marginTop: 14 }}>{project.name}</h1>
            <p className="muted">{project.description || "Planejamento e execução integrada da obra."}</p>
          </div>
          <div className="client-progress-ring" style={{ "--progress": formatPercent(project.progress) } as React.CSSProperties}>
            <strong>{formatPercent(project.progress)}</strong>
          </div>
        </div>
        <div className="project-meta">
          <span><strong>Cliente:</strong> {project.client?.trade_name || project.client?.legal_name || "—"}</span>
          <span><strong>Contrato:</strong> {project.contract?.code || "—"}</span>
          <span><strong>Período:</strong> {formatDate(project.planned_start)} → {formatDate(project.planned_end)}</span>
          <span><strong>Local:</strong> {[project.city, project.state].filter(Boolean).join(" / ") || "—"}</span>
          <span><strong>Status:</strong> {project.status}</span>
        </div>
      </section>

      <section className="grid grid-kpi">
        <article className="card kpi"><small>TAREFAS</small><strong>{completed}/{tasks.length}</strong></article>
        <article className="card kpi"><small>BLOQUEADAS</small><strong>{blocked}</strong></article>
        <article className="card kpi"><small>ATRASADAS</small><strong>{overdue}</strong></article>
        <article className="card kpi"><small>DOCUMENTOS LIBERADOS</small><strong>{releasedDocs}</strong></article>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", marginTop: 22 }}>
        <article className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18 }}>
            <div><h2>Previsto x realizado</h2><p className="muted">Última fotografia do cronograma.</p></div>
            <span className="badge">{latestSnapshot?.snapshot_date ? formatDate(latestSnapshot.snapshot_date) : "Sem snapshot"}</span>
          </div>
          <div className="progress-row" style={{ marginTop: 20 }}>
            <div><strong>Previsto</strong><span>{formatPercent(latestSnapshot?.planned_progress)}</span></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: formatPercent(latestSnapshot?.planned_progress) }} /></div>
          </div>
          <div className="progress-row" style={{ marginTop: 16 }}>
            <div><strong>Realizado</strong><span>{formatPercent(latestSnapshot?.actual_progress ?? project.progress)}</span></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: formatPercent(latestSnapshot?.actual_progress ?? project.progress) }} /></div>
          </div>
        </article>

        <article className="card card-pad">
          <h2>Portal do cliente</h2>
          <p className="muted">Controle explícito do que o cliente pode acompanhar.</p>
          <p>{project.client_released_at ? <span className="badge badge-success">Obra liberada</span> : <span className="badge badge-warning">Ainda interna</span>}</p>
          <form action={releaseProjectToClient}>
            <input type="hidden" name="projectId" value={id} />
            <input type="hidden" name="release" value={project.client_released_at ? "false" : "true"} />
            <button className="button button-secondary" type="submit">
              {project.client_released_at ? "Retirar do portal" : "Liberar acompanhamento"}
            </button>
          </form>
          <div className="validation">Somente tarefas, marcos, diários, mídias e documentos marcados como visíveis são exibidos.</div>
        </article>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", marginTop: 22 }}>
        <article className="card card-pad">
          <h2>Próximos marcos</h2>
          <div className="timeline" style={{ marginTop: 14 }}>
            {(milestonesResult.data ?? []).map((milestone) => (
              <div key={milestone.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
                <span>{milestone.title}</span>
                <span className={milestone.completed ? "badge badge-success" : "badge"}>{formatDate(milestone.planned_date)}</span>
              </div>
            ))}
            {!milestonesResult.data?.length ? <p className="muted">Nenhum marco cadastrado.</p> : null}
          </div>
        </article>

        <article className="card card-pad">
          <h2>Diários recentes</h2>
          <div style={{ marginTop: 14 }}>
            {(logsResult.data ?? []).map((log) => (
              <a key={log.id} href={`/app/obras/${id}/diario/${log.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
                <span><strong>{formatDate(log.log_date)}</strong><br /><span className="muted">{log.summary || "Sem resumo"}</span></span>
                <span className={statusBadge(log.status)}>{log.status}</span>
              </a>
            ))}
            {!logsResult.data?.length ? <p className="muted">Nenhum diário registrado.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
