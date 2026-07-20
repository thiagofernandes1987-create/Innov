import { notFound } from "next/navigation";
import { createBaseline, createDependency, createMilestone } from "@/app/actions/projects";
import { ProjectNav } from "@/components/project-nav";
import { requireOrganizationContext } from "@/lib/auth";
import { daysBetween, formatDate, formatPercent, statusBadge } from "@/lib/stage12";

export default async function SchedulePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: pageError } = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext();
  const [projectResult, tasksResult, dependenciesResult, milestonesResult, baselinesResult] = await Promise.all([
    supabase.from("projects").select("id,code,name,planned_start,planned_end,progress").eq("id", id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("project_tasks").select("id,code,title,status,progress,planned_start,planned_end,duration_days").eq("project_id", id).neq("status", "CANCELED").order("planned_start"),
    supabase.from("task_dependencies").select("id,predecessor_task_id,successor_task_id,dependency_type,lag_days").eq("project_id", id),
    supabase.from("project_milestones").select("id,code,title,planned_date,actual_date,completed,client_visible").eq("project_id", id).order("planned_date"),
    supabase.from("schedule_baselines").select("id,version_number,name,status,frozen_at,created_at").eq("project_id", id).order("version_number", { ascending: false })
  ]);
  const project = projectResult.data;
  if (!project) notFound();
  const tasks = tasksResult.data ?? [];
  const totalDays = Math.max(daysBetween(project.planned_start, project.planned_end) ?? 1, 1);
  const projectStart = project.planned_start ? new Date(`${project.planned_start}T12:00:00`) : null;
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const delayed = tasks.filter((task) => task.planned_end && new Date(`${task.planned_end}T23:59:59`) < new Date() && task.status !== "COMPLETED").length;

  return (
    <main className="content">
      <ProjectNav projectId={id} />
      <div className="page-head">
        <div>
          <span className="badge">{project.code}</span>
          <h1>Cronograma</h1>
          <p className="muted">Linha do tempo, relações lógicas, marcos e baseline congelada.</p>
        </div>
        <span className={delayed ? "badge badge-danger" : "badge badge-success"}>{delayed ? `${delayed} atividade(s) atrasada(s)` : "Sem atraso identificado"}</span>
      </div>

      {pageError ? <div className="validation blocking">{pageError}</div> : null}
      {tasksResult.error ? <div className="validation blocking">{tasksResult.error.message}</div> : null}

      <section className="card card-pad">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
          <div><h2>Linha do tempo</h2><p className="muted">{formatDate(project.planned_start)} → {formatDate(project.planned_end)} · {totalDays} dias</p></div>
          <span className="badge">Progresso {formatPercent(project.progress)}</span>
        </div>
        <div className="timeline" style={{ marginTop: 18 }}>
          {tasks.map((task) => {
            const startOffset = projectStart && task.planned_start
              ? Math.max(0, Math.round((new Date(`${task.planned_start}T12:00:00`).getTime() - projectStart.getTime()) / 86400000))
              : 0;
            const taskDays = Math.max(daysBetween(task.planned_start, task.planned_end) ?? Number(task.duration_days) ?? 1, 1);
            const left = Math.min(100, (startOffset / totalDays) * 100);
            const width = Math.max(1.5, Math.min(100 - left, (taskDays / totalDays) * 100));
            return (
              <div className="timeline-row" key={task.id}>
                <div><span className="mono muted">{task.code}</span><br /><strong>{task.title}</strong></div>
                <div className="timeline-bar" title={`${formatDate(task.planned_start)} a ${formatDate(task.planned_end)}`}>
                  <span style={{ left: `${left}%`, width: `${width}%`, opacity: task.status === "COMPLETED" ? 1 : .72 }} />
                </div>
                <div><span className={statusBadge(task.status)}>{formatPercent(task.progress)}</span></div>
              </div>
            );
          })}
          {!tasks.length ? <p className="muted">Cadastre tarefas com datas planejadas para montar a linha do tempo.</p> : null}
        </div>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", marginTop: 22 }}>
        <article className="card card-pad">
          <h2>Dependências</h2>
          <p className="muted">FS: término-início; SS: início-início; FF: término-término; SF: início-término.</p>
          <div style={{ margin: "14px 0 20px" }}>
            {(dependenciesResult.data ?? []).map((dependency) => {
              const predecessor = taskById.get(dependency.predecessor_task_id);
              const successor = taskById.get(dependency.successor_task_id);
              return <div key={dependency.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <strong>{predecessor?.code ?? "?"}</strong> → <strong>{successor?.code ?? "?"}</strong> <span className="badge">{dependency.dependency_type} {Number(dependency.lag_days) ? `+${dependency.lag_days}d` : ""}</span>
              </div>;
            })}
            {!dependenciesResult.data?.length ? <p className="muted">Nenhuma relação cadastrada.</p> : null}
          </div>
          <form action={createDependency} className="field-form">
            <input type="hidden" name="projectId" value={id} />
            <label>Predecessora<select name="predecessorTaskId" required><option value="">Selecione</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.code} · {task.title}</option>)}</select></label>
            <label>Sucessora<select name="successorTaskId" required><option value="">Selecione</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.code} · {task.title}</option>)}</select></label>
            <div className="field-grid">
              <label>Tipo<select name="dependencyType" defaultValue="FS"><option value="FS">FS</option><option value="SS">SS</option><option value="FF">FF</option><option value="SF">SF</option></select></label>
              <label>Defasagem (dias)<input type="number" step="0.5" name="lagDays" defaultValue="0" /></label>
            </div>
            <button className="button button-secondary" type="submit">Adicionar dependência</button>
          </form>
        </article>

        <article className="card card-pad">
          <h2>Marcos</h2>
          <div style={{ margin: "14px 0 20px" }}>
            {(milestonesResult.data ?? []).map((milestone) => <div key={milestone.id} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "10px 0", borderBottom: "1px solid var(--border)" }}><span><strong>{milestone.code}</strong> · {milestone.title}</span><span className={milestone.completed ? "badge badge-success" : "badge"}>{formatDate(milestone.planned_date)}</span></div>)}
            {!milestonesResult.data?.length ? <p className="muted">Nenhum marco cadastrado.</p> : null}
          </div>
          <form action={createMilestone} className="field-form">
            <input type="hidden" name="projectId" value={id} />
            <div className="field-grid"><label>Código<input name="code" required /></label><label>Data<input type="date" name="plannedDate" required /></label></div>
            <label>Título<input name="title" required /></label>
            <label>Descrição<textarea name="description" rows={2} /></label>
            <label><span><input style={{ width: "auto" }} type="checkbox" name="clientVisible" defaultChecked /> Visível ao cliente</span></label>
            <button className="button button-secondary" type="submit">Adicionar marco</button>
          </form>
        </article>
      </section>

      <section className="card card-pad" style={{ marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
          <div><h2>Baselines</h2><p className="muted">Uma baseline congelada preserva as datas e pesos das tarefas daquele momento.</p></div>
          <form action={createBaseline} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <input type="hidden" name="projectId" value={id} />
            <label>Nome<input name="name" placeholder="Baseline contratual" required /></label>
            <label>Observação<input name="notes" /></label>
            <button className="button button-primary" type="submit">Congelar nova baseline</button>
          </form>
        </div>
        <div className="table-wrap" style={{ marginTop: 16 }}><table><thead><tr><th>Versão</th><th>Nome</th><th>Status</th><th>Congelada em</th></tr></thead><tbody>{(baselinesResult.data ?? []).map((baseline) => <tr key={baseline.id}><td className="mono">V{baseline.version_number}</td><td>{baseline.name}</td><td><span className={statusBadge(baseline.status)}>{baseline.status}</span></td><td>{baseline.frozen_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(baseline.frozen_at)) : "—"}</td></tr>)}{!baselinesResult.data?.length ? <tr><td colSpan={4}>Nenhuma baseline congelada.</td></tr> : null}</tbody></table></div>
      </section>
    </main>
  );
}
