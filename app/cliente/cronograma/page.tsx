import Link from "next/link";
import { requireClientContext } from "@/lib/auth";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { formatDate, formatPercent, statusBadge, taskStatusLabels } from "@/lib/stage12";

export default async function ClientSchedulePage() {
  const { supabase, client } = await requireClientContext();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id,code,name,status,progress,planned_start,planned_end,project_tasks(id,code,title,status,progress,planned_start,planned_end,client_visible),project_milestones(id,code,title,planned_date,actual_date,completed,client_visible)")
    .eq("client_id", client.id)
    .not("client_released_at", "is", null)
    .order("planned_start");

  if (error) reportDataAccessError("client-schedule.page.load", error);

  return (
    <main className="content">
      <div className="page-head"><div><span className="badge">PLANEJAMENTO</span><h1>Cronograma</h1><p className="muted">Atividades e marcos liberados pela Innovar.</p></div></div>
      {error ? <div className="validation blocking">Não foi possível carregar o cronograma.</div> : null}
      <section className="grid">
        {(projects ?? []).map((project) => {
          const tasks = (project.project_tasks ?? []).filter((task) => task.client_visible && task.status !== "CANCELED");
          const milestones = (project.project_milestones ?? []).filter((milestone) => milestone.client_visible);
          return <article className="card" key={project.id}>
            <div className="card-pad" style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}><div><span className="mono muted">{project.code}</span><h2>{project.name}</h2><p className="muted">{formatDate(project.planned_start)} → {formatDate(project.planned_end)}</p></div><div style={{ minWidth: 190 }}><div className="progress-row"><div><strong>Progresso</strong><span>{formatPercent(project.progress)}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: formatPercent(project.progress) }} /></div></div></div></div>
            <div className="table-wrap"><table><thead><tr><th>Atividade</th><th>Status</th><th>Progresso</th><th>Período</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td><strong>{task.code}</strong><br /><span className="muted">{task.title}</span></td><td><span className={statusBadge(task.status)}>{taskStatusLabels[task.status] ?? task.status}</span></td><td>{formatPercent(task.progress)}</td><td>{formatDate(task.planned_start)} → {formatDate(task.planned_end)}</td></tr>)}{!tasks.length ? <tr><td colSpan={4}>Nenhuma atividade liberada.</td></tr> : null}</tbody></table></div>
            <div className="card-pad"><h3>Marcos</h3>{milestones.map((milestone) => <div key={milestone.id} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "9px 0", borderBottom: "1px solid var(--border)" }}><span>{milestone.code} · {milestone.title}</span><span className={milestone.completed ? "badge badge-success" : "badge"}>{formatDate(milestone.actual_date || milestone.planned_date)}</span></div>)}<p style={{ marginTop: 16 }}><Link className="button button-secondary" href={`/cliente/obras/${project.id}`}>Abrir obra</Link></p></div>
          </article>;
        })}
        {!projects?.length ? <article className="card card-pad"><strong>Nenhum cronograma liberado.</strong></article> : null}
      </section>
    </main>
  );
}
