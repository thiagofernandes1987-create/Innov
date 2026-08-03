import { notFound } from "next/navigation";
import { createBaseline, createMilestone } from "@/app/actions/projects";
import { SchedulePlanner } from "@/components/planejamento/schedule-planner";
import { ProjectNav } from "@/components/project-nav";
import type { TipoDependencia } from "@/lib/planejamento/cronograma";
import { requireOrganizationContext } from "@/lib/auth";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { daysBetween, formatDate, formatPercent, statusBadge } from "@/lib/stage12";
import { ESCOPOS, sugestoesDoEscopo } from "@/lib/sugestoes/servidor";

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
  const [projectResult, wbsResult, tasksResult, dependenciesResult, milestonesResult, baselinesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id,code,name,planned_start,planned_end,progress")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("work_breakdown_items")
      .select("id,parent_id,code,title,sequence,planned_start,planned_end,progress")
      .eq("project_id", id)
      .neq("status", "CANCELED")
      .order("sequence")
      .order("code"),
    supabase
      .from("project_tasks")
      .select("id,wbs_id,parent_task_id,code,title,description,status,priority,sequence,progress,planned_start,planned_end,duration_days")
      .eq("project_id", id)
      .neq("status", "CANCELED")
      .order("sequence")
      .order("code"),
    supabase
      .from("task_dependencies")
      .select("id,predecessor_task_id,successor_task_id,dependency_type,lag_days")
      .eq("project_id", id),
    supabase
      .from("project_milestones")
      .select("id,code,title,planned_date,actual_date,completed,client_visible")
      .eq("project_id", id)
      .order("planned_date"),
    supabase
      .from("schedule_baselines")
      .select("id,version_number,name,status,frozen_at,created_at")
      .eq("project_id", id)
      .order("version_number", { ascending: false })
  ]);

  reportDataAccessError("project-schedule.project", projectResult.error);
  reportDataAccessError("project-schedule.wbs", wbsResult.error);
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
  const scheduleLoadFailed = Boolean(wbsResult.error || tasksResult.error || dependenciesResult.error);
  const milestonesLoadFailed = Boolean(milestonesResult.error);
  const baselinesLoadFailed = Boolean(baselinesResult.error);
  const loadFailed = scheduleLoadFailed || milestonesLoadFailed || baselinesLoadFailed;
  const totalDays = Math.max(daysBetween(project.planned_start, project.planned_end) ?? 1, 1);
  const delayed = tasks.filter(task => task.planned_end && new Date(`${task.planned_end}T23:59:59`) < new Date() && task.status !== "COMPLETED").length;

  // Vocabulário da organização para os dois campos que mais se repetem entre
  // obras. Carregado no servidor, e não no cliente, porque a leitura passa pela
  // RLS: quem não tem acesso à organização não recebe catálogo nenhum.
  const [sugestoesDeEtapa, sugestoesDeAtividade] = await Promise.all([
    sugestoesDoEscopo(supabase, organizationId, ESCOPOS.etapaDaEap),
    sugestoesDoEscopo(supabase, organizationId, ESCOPOS.atividadeDaEap)
  ]);

  return (
    <main className="content">
      <ProjectNav projectId={id} />
      <div className="page-head">
        <div>
          <span className="badge">{project.code}</span>
          <h1>Cronograma</h1>
          <p className="muted">
            EAP, atividades, relações lógicas e barras do Gantt na mesma área de trabalho.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span className="badge">{formatDate(project.planned_start)} – {formatDate(project.planned_end)} · {totalDays} dias</span>
          <span className="badge">Progresso {formatPercent(project.progress)}</span>
          {!scheduleLoadFailed ? (
            <span className={delayed ? "badge badge-danger" : "badge badge-success"}>
              {delayed ? `${delayed} atividade(s) atrasada(s)` : "Sem atraso identificado"}
            </span>
          ) : null}
        </div>
      </div>

      {pageError ? <div className="validation blocking" role="alert">{pageError}</div> : null}
      {loadFailed ? <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div> : null}

      {!scheduleLoadFailed ? (
        <SchedulePlanner
          sugestoesDeEtapa={sugestoesDeEtapa}
          sugestoesDeAtividade={sugestoesDeAtividade}
          projectId={id}
          projectStart={project.planned_start}
          projectEnd={project.planned_end}
          projectProgress={Number(project.progress) || 0}
          today={new Date().toISOString().slice(0, 10)}
          wbsItems={(wbsResult.data ?? []).map(item => ({
            id: item.id,
            parentId: item.parent_id,
            code: item.code,
            title: item.title,
            sequence: Number(item.sequence) || 0,
            plannedStart: item.planned_start,
            plannedEnd: item.planned_end,
            progress: Number(item.progress) || 0
          }))}
          tasks={tasks.map(task => ({
            id: task.id,
            wbsId: task.wbs_id,
            parentTaskId: task.parent_task_id,
            code: task.code,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            sequence: Number(task.sequence) || 0,
            plannedStart: task.planned_start,
            plannedEnd: task.planned_end,
            durationDays: Number(task.duration_days ?? 1),
            progress: Number(task.progress) || 0
          }))}
          dependencies={(dependenciesResult.data ?? []).map(dependency => ({
            id: dependency.id,
            predecessorId: dependency.predecessor_task_id,
            successorId: dependency.successor_task_id,
            type: dependency.dependency_type as TipoDependencia,
            lagDays: Number(dependency.lag_days) || 0
          }))}
        />
      ) : (
        <section className="card card-pad">
          <h2>Planejamento</h2>
          <p className="muted">A EAP, as atividades ou as dependências não puderam ser carregadas.</p>
        </section>
      )}

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", marginTop: 22 }}>
        <article className="card card-pad">
          <h2>Marcos</h2>
          {!milestonesLoadFailed ? (
            <>
              <div style={{ margin: "14px 0 20px" }}>
                {(milestonesResult.data ?? []).map(milestone => (
                  <div key={milestone.id} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <span><strong>{milestone.code}</strong> · {milestone.title}</span>
                    <span className={milestone.completed ? "badge badge-success" : "badge"}>{formatDate(milestone.planned_date)}</span>
                  </div>
                ))}
                {!milestonesResult.data?.length ? <p className="muted">Nenhum marco cadastrado.</p> : null}
              </div>
              <form action={createMilestone} className="field-form">
                <input type="hidden" name="projectId" value={id} />
                <div className="field-grid">
                  <label>Código<input name="code" required /></label>
                  <label>Data<input type="date" name="plannedDate" required /></label>
                </div>
                <label>Título<input name="title" required /></label>
                <label>Descrição<textarea name="description" rows={2} /></label>
                <label><span><input style={{ width: "auto" }} type="checkbox" name="clientVisible" defaultChecked /> Visível ao cliente</span></label>
                <button className="button button-secondary" type="submit">Adicionar marco</button>
              </form>
            </>
          ) : <p className="muted">Cadastro indisponível até os marcos serem recarregados.</p>}
        </article>

        <article className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
            <div>
              <h2>Baselines</h2>
              <p className="muted">Congele versões para comparar o planejado com as revisões futuras.</p>
            </div>
          </div>
          {!baselinesLoadFailed ? (
            <>
              <form action={createBaseline} className="field-form" style={{ marginTop: 14 }}>
                <input type="hidden" name="projectId" value={id} />
                <label>Nome<input name="name" placeholder="Baseline contratual" required /></label>
                <label>Observação<input name="notes" /></label>
                <button className="button button-primary" type="submit">Congelar nova baseline</button>
              </form>
              <div className="table-wrap" style={{ marginTop: 16 }}>
                <table>
                  <thead><tr><th>Versão</th><th>Nome</th><th>Status</th><th>Congelada em</th></tr></thead>
                  <tbody>
                    {(baselinesResult.data ?? []).map(baseline => (
                      <tr key={baseline.id}>
                        <td className="mono">V{baseline.version_number}</td>
                        <td>{baseline.name}</td>
                        <td><span className={statusBadge(baseline.status)}>{baseline.status}</span></td>
                        <td>{baseline.frozen_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(baseline.frozen_at)) : "—"}</td>
                      </tr>
                    ))}
                    {!baselinesResult.data?.length ? <tr><td colSpan={4}>Nenhuma baseline congelada.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : <p className="muted">Histórico de baselines temporariamente indisponível.</p>}
        </article>
      </section>
    </main>
  );
}
