import { notFound } from "next/navigation";
import { createBaseline, createDependency, createMilestone } from "@/app/actions/projects";
import { Gantt } from "@/components/planejamento/gantt";
import { ProjectNav } from "@/components/project-nav";
import type { TipoDependencia } from "@/lib/planejamento/cronograma";
import { requireOrganizationContext } from "@/lib/auth";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
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

  reportDataAccessError("project-schedule.project", projectResult.error);
  reportDataAccessError("project-schedule.tasks", tasksResult.error);
  reportDataAccessError("project-schedule.dependencies", dependenciesResult.error);
  reportDataAccessError("project-schedule.milestones", milestonesResult.error);
  reportDataAccessError("project-schedule.baselines", baselinesResult.error);

  if (projectResult.error) {
    return (
      <main className="content">
        <ProjectNav projectId={id} />
        <h1>Cronograma</h1>
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
      </main>
    );
  }

  const project = projectResult.data;
  if (!project) notFound();

  const tasks = tasksResult.data ?? [];
  const scheduleLoadFailed = Boolean(tasksResult.error || dependenciesResult.error);
  const milestonesLoadFailed = Boolean(milestonesResult.error);
  const baselinesLoadFailed = Boolean(baselinesResult.error);
  const loadFailed = scheduleLoadFailed || milestonesLoadFailed || baselinesLoadFailed;
  const totalDays = Math.max(daysBetween(project.planned_start, project.planned_end) ?? 1, 1);
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
        {!scheduleLoadFailed ? <span className={delayed ? "badge badge-danger" : "badge badge-success"}>{delayed ? `${delayed} atividade(s) atrasada(s)` : "Sem atraso identificado"}</span> : null}
      </div>

      {pageError ? <div className="validation blocking" role="alert">{pageError}</div> : null}
      {loadFailed ? <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div> : null}

      {!scheduleLoadFailed ? (
        <section className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 14 }}>
            <div>
              <h2>Cronograma</h2>
              <p className="muted">{formatDate(project.planned_start)} - {formatDate(project.planned_end)} - {totalDays} dias programados</p>
            </div>
            <span className="badge">Progresso {formatPercent(project.progress)}</span>
          </div>

          <Gantt
            tarefas={tasks.map((task) => ({
              id: task.id,
              titulo: `${task.code} - ${task.title}`,
              duracaoDias: Number(task.duration_days) || 1,
              inicioPlanejado: task.planned_start,
              terminoPlanejado: task.planned_end,
              progresso: Number(task.progress) || 0
            }))}
            dependencias={(dependenciesResult.data ?? []).map((dep) => ({
              predecessorId: dep.predecessor_task_id,
              sucessorId: dep.successor_task_id,
              tipo: dep.dependency_type as TipoDependencia,
              folgaDias: Number(dep.lag_days) || 0
            }))}
            hoje={new Date().toISOString().slice(0, 10)}
          />
        </section>
      ) : (
        <section className="card card-pad"><h2>Cronograma</h2><p className="muted">A linha do tempo está temporariamente indisponível porque tarefas ou dependências não puderam ser carregadas.</p></section>
      )}

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", marginTop: 22 }}>
        <article className="card card-pad">
          <h2>Dependências</h2>
          {!scheduleLoadFailed ? (
            <>
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
            </>
          ) : <p className="muted">Cadastro indisponível até tarefas e relações serem recarregadas.</p>}
        </article>

        <article className="card card-pad">
          <h2>Marcos</h2>
          {!milestonesLoadFailed ? (
            <>
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
            </>
          ) : <p className="muted">Cadastro indisponível até os marcos serem recarregados.</p>}
        </article>
      </section>

      <section className="card card-pad" style={{ marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
          <div><h2>Baselines</h2><p className="muted">Uma baseline congelada preserva as datas e pesos das tarefas daquele momento.</p></div>
          {!baselinesLoadFailed && !scheduleLoadFailed ? (
            <form action={createBaseline} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
              <input type="hidden" name="projectId" value={id} />
              <label>Nome<input name="name" placeholder="Baseline contratual" required /></label>
              <label>Observação<input name="notes" /></label>
              <button className="button button-primary" type="submit">Congelar nova baseline</button>
            </form>
          ) : null}
        </div>
        {!baselinesLoadFailed ? <div className="table-wrap" style={{ marginTop: 16 }}><table><thead><tr><th>Versão</th><th>Nome</th><th>Status</th><th>Congelada em</th></tr></thead><tbody>{(baselinesResult.data ?? []).map((baseline) => <tr key={baseline.id}><td className="mono">V{baseline.version_number}</td><td>{baseline.name}</td><td><span className={statusBadge(baseline.status)}>{baseline.status}</span></td><td>{baseline.frozen_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(baseline.frozen_at)) : "—"}</td></tr>)}{!baselinesResult.data?.length ? <tr><td colSpan={4}>Nenhuma baseline congelada.</td></tr> : null}</tbody></table></div> : <p className="muted">Histórico de baselines temporariamente indisponível.</p>}
      </section>
    </main>
  );
}
