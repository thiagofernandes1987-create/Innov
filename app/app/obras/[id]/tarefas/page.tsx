import { notFound } from "next/navigation";
import { createTask, moveTask } from "@/app/actions/projects";
import { ProjectNav } from "@/components/project-nav";
import { requireOrganizationContext } from "@/lib/auth";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { nomesDosUsuarios } from "@/lib/pessoas/nomes";
import { formatDate, formatPercent, taskColumns, taskStatusLabels } from "@/lib/stage12";

export default async function TasksPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: pageError } = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext();
  const [projectResult, tasksResult, wbsResult, membershipsResult] = await Promise.all([
    supabase.from("projects").select("id,code,name").eq("id", id).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("project_tasks").select("id,code,title,description,status,priority,progress,weight,planned_start,planned_end,responsible_id,blocked_reason,client_visible,wbs_id").eq("project_id", id).order("sequence"),
    supabase.from("work_breakdown_items").select("id,code,title").eq("project_id", id).order("sequence"),
    // Sem embed de `profiles`: `project_memberships.user_id` aponta para
    // `auth.users`, não para `public.profiles`, então `profiles(full_name)`
    // devolvia PGRST200 — relação inexistente — e a consulta inteira falhava.
    // O nome vem numa segunda leitura, como nas outras cinco telas que já
    // resolvem pessoa assim.
    supabase.from("project_memberships").select("user_id,role").eq("project_id", id).eq("active", true)
  ]);

  reportDataAccessError("project-tasks.project", projectResult.error);
  reportDataAccessError("project-tasks.collection", tasksResult.error);
  reportDataAccessError("project-tasks.wbs", wbsResult.error);
  reportDataAccessError("project-tasks.memberships", membershipsResult.error);

  if (projectResult.error) {
    return (
      <main className="content">
        <ProjectNav projectId={id} />
        <h1>Tarefas</h1>
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
      </main>
    );
  }

  const project = projectResult.data;
  if (!project) notFound();

  const tasks = tasksResult.data ?? [];
  const wbs = wbsResult.data ?? [];
  const memberships = membershipsResult.data ?? [];
  const nomePorUsuario = await nomesDosUsuarios(supabase, memberships.map(m => m.user_id));
  const tasksLoadFailed = Boolean(tasksResult.error);
  const supportLoadFailed = Boolean(wbsResult.error || membershipsResult.error);

  return (
    <main className="content">
      <ProjectNav projectId={id} />
      <div className="page-head">
        <div>
          <span className="badge">{project.code}</span>
          <h1>Tarefas</h1>
          <p className="muted">Kanban operacional com datas, peso, progresso e responsável.</p>
        </div>
      </div>

      {pageError ? <div className="validation blocking" role="alert">{pageError}</div> : null}
      {tasksLoadFailed || supportLoadFailed ? <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div> : null}

      {!tasksLoadFailed ? (
        <section className="kanban" aria-label="Quadro de tarefas da obra">
          {taskColumns.map(([status, label]) => {
            const columnTasks = tasks.filter((task) => task.status === status);
            return (
              <section key={status} className="kanban-column" aria-labelledby={`column-${status}`}>
                <div className="kanban-head"><span id={`column-${status}`}>{label}</span><span className="badge">{columnTasks.length}</span></div>
                {columnTasks.map((task) => (
                  <article key={task.id} className="task-card">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span className="mono muted">{task.code}</span>
                      <span className={task.priority === "CRITICAL" ? "badge badge-danger" : task.priority === "HIGH" ? "badge badge-warning" : "badge"}>{task.priority}</span>
                    </div>
                    <h3>{task.title}</h3>
                    {task.description ? <p className="muted" style={{ fontSize: 13 }}>{task.description}</p> : null}
                    <div className="progress-row">
                      <div><span className="muted">Progresso</span><strong>{formatPercent(task.progress)}</strong></div>
                      <div className="progress-track"><div className="progress-fill" style={{ width: formatPercent(task.progress) }} /></div>
                    </div>
                    <p className="muted" style={{ fontSize: 12 }}>{formatDate(task.planned_start)} → {formatDate(task.planned_end)} · Peso {formatPercent(task.weight, 1)}</p>
                    {task.blocked_reason ? <div className="validation blocking">{task.blocked_reason}</div> : null}
                    {!task.client_visible ? <span className="badge">Interna</span> : null}
                    <form action={moveTask}>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <label>
                        Mover para
                        <select name="status" defaultValue={task.status}>
                          {taskColumns.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
                          <option value="CANCELED">Cancelada</option>
                        </select>
                      </label>
                      <label>Progresso (%)<input type="number" name="progressPercent" min="0" max="100" step="1" defaultValue={Math.round(Number(task.progress) * 100)} /></label>
                      <label>Motivo do bloqueio<textarea name="reason" rows={2} defaultValue={task.blocked_reason ?? ""} /></label>
                      <button className="button button-secondary" type="submit">Atualizar tarefa</button>
                    </form>
                  </article>
                ))}
                {!columnTasks.length ? <p className="muted" style={{ textAlign: "center", padding: 18 }}>Nenhuma tarefa.</p> : null}
              </section>
            );
          })}
        </section>
      ) : null}

      {!supportLoadFailed ? (
        <section className="card card-pad" style={{ marginTop: 24 }}>
          <h2>Nova tarefa</h2>
          <p className="muted">O progresso geral da obra é recalculado automaticamente após cada movimentação.</p>
          <form action={createTask} className="field-form" style={{ marginTop: 18 }}>
            <input type="hidden" name="projectId" value={id} />
            <div className="field-grid">
              <label>Código<input name="code" placeholder="03.02.010" required /></label>
              <label>Título<input name="title" required /></label>
              <label>Pacote EAP
                <select name="wbsId"><option value="">Sem pacote</option>{wbs.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}</select>
              </label>
              <label>Responsável
                <select name="responsibleId"><option value="">Não definido</option>{memberships.map((membership) => (
                  <option key={membership.user_id} value={membership.user_id}>
                    {nomePorUsuario.get(membership.user_id) || membership.user_id.slice(0, 8)} · {membership.role}
                  </option>
                ))}</select>
              </label>
              <label>Prioridade<select name="priority" defaultValue="NORMAL"><option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></label>
              <label>Status<select name="status" defaultValue="BACKLOG">{Object.entries(taskStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Início planejado<input type="date" name="plannedStart" /></label>
              <label>Término planejado<input type="date" name="plannedEnd" /></label>
              <label>Duração (dias)<input type="number" name="durationDays" min="0" step="0.5" defaultValue="1" /></label>
              <label>Peso (%)<input type="number" name="weightPercent" min="0" max="100" step="0.01" /></label>
              <label>Sequência<input type="number" name="sequence" defaultValue="0" /></label>
              <label style={{ alignContent: "end" }}><span><input style={{ width: "auto" }} type="checkbox" name="clientVisible" defaultChecked /> Visível ao cliente</span></label>
              <label className="span-2">Descrição<textarea name="description" rows={3} /></label>
            </div>
            <button className="button button-primary" type="submit">Adicionar tarefa</button>
          </form>
        </section>
      ) : (
        <section className="card card-pad" style={{ marginTop: 24 }}>
          <h2>Nova tarefa</h2>
          <p className="muted">O cadastro está temporariamente indisponível porque EAP ou responsáveis não puderam ser carregados.</p>
        </section>
      )}
    </main>
  );
}
