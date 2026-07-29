import Link from "next/link";
import { SmartSearchBar } from "@/components/busca/smart-search-bar";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { PlanningPortfolioView } from "@/components/planejamento/portfolio-view";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { requireOrganizationContext } from "@/lib/auth";
import { formatDate, formatPercent } from "@/lib/stage12";
import { singleRelation } from "@/lib/supabase/relations";

function prazoDoProjeto(plannedEnd: string | null, overdue: number) {
  if (overdue > 0) return { className: "badge badge-danger", label: "Atrasado" };
  if (!plannedEnd) return { className: "badge", label: "Sem prazo" };
  const days = Math.round((new Date(`${plannedEnd}T12:00:00`).getTime() - Date.now()) / 86400000);
  if (days < 0) return { className: "badge badge-danger", label: `Vencido há ${Math.abs(days)} d` };
  if (days <= 7) return { className: "badge badge-warning", label: `Vence em ${days} d` };
  return { className: "badge badge-success", label: "No prazo" };
}

function differenceInDays(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  return Math.round(
    (new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86_400_000
  );
}

export default async function PlanningPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string; city?: string; district?: string; entryMode?: string }>;
}) {
  const query = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext();
  const [projectsResult, milestonesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id,code,name,status,entry_mode,city,district,progress,planned_start,planned_end,clients(legal_name,trade_name,email,phone),project_tasks(id,title,status,planned_start,planned_end,responsible_id)")
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .order("planned_start"),
    supabase
      .from("project_milestones")
      .select("id,project_id,title,planned_date,completed,projects(code,name)")
      .eq("organization_id", organizationId)
      .gte("planned_date", new Date().toISOString().slice(0, 10))
      .order("planned_date")
      .limit(50)
  ]);

  reportDataAccessError("planning.projects", projectsResult.error);
  reportDataAccessError("planning.milestones", milestonesResult.error);

  const rowsBase = (projectsResult.data ?? []).map((project) => {
    const tasks = [...(project.project_tasks ?? [])].sort((a, b) =>
      String(a.planned_start ?? "9999-12-31").localeCompare(String(b.planned_start ?? "9999-12-31"))
    );
    const overdue = tasks.filter((task) => task.planned_end && new Date(`${task.planned_end}T23:59:59`) < new Date() && task.status !== "COMPLETED").length;
    const blocked = tasks.filter((task) => task.status === "BLOCKED").length;
    const openTasks = tasks.filter((task) => !["COMPLETED", "CANCELED"].includes(task.status));
    const current = openTasks.find((task) => ["IN_PROGRESS", "BLOCKED"].includes(task.status)) ?? openTasks[0] ?? null;
    const currentIndex = current ? openTasks.findIndex((task) => task.id === current.id) : -1;
    const next = currentIndex >= 0 ? (openTasks[currentIndex + 1] ?? null) : null;
    const latestTaskEnd = tasks.map((task) => task.planned_end).filter((date): date is string => Boolean(date)).sort().at(-1) ?? null;
    return {
      ...project,
      client: singleRelation(project.clients),
      overdue,
      blocked,
      current,
      next,
      slack: differenceInDays(latestTaskEnd, project.planned_end)
    };
  });

  const responsibleIds = [...new Set(rowsBase.map((row) => row.current?.responsible_id).filter((id): id is string => Boolean(id)))];
  const profilesResult = responsibleIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", responsibleIds)
    : { data: [], error: null };
  reportDataAccessError("planning.responsibles", profilesResult.error);

  const profileById = new Map((profilesResult.data ?? []).map((profile) => [
    profile.id,
    profile.full_name || profile.email || profile.id.slice(0, 8)
  ]));

  const normalizedQuery = String(query.q ?? "").trim().toLocaleLowerCase("pt-BR");
  const filteredRows = rowsBase.map((row) => ({
    ...row,
    responsible: row.current?.responsible_id ? (profileById.get(row.current.responsible_id) ?? "Não identificado") : "Não atribuído"
  })).filter((row) => {
    const searchable = [
      row.code,
      row.name,
      row.city,
      row.district,
      row.client?.trade_name,
      row.client?.legal_name,
      row.client?.email,
      row.client?.phone,
      row.current?.title,
      row.responsible
    ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
    if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
    if (query.status && row.status !== query.status) return false;
    if (query.entryMode && row.entry_mode !== query.entryMode) return false;
    if (query.city && !String(row.city ?? "").toLocaleLowerCase("pt-BR").includes(query.city.toLocaleLowerCase("pt-BR"))) return false;
    if (query.district && !String(row.district ?? "").toLocaleLowerCase("pt-BR").includes(query.district.toLocaleLowerCase("pt-BR"))) return false;
    return true;
  });

  const portfolioRows = filteredRows.map((row) => {
    const deadline = prazoDoProjeto(row.planned_end, row.overdue);
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      entryMode: row.entry_mode,
      location: [row.district, row.city].filter(Boolean).join(" · ") || "—",
      clientName: row.client?.trade_name || row.client?.legal_name || "Sem cliente",
      currentTitle: row.current?.title ?? "Sem tarefa aberta",
      currentStatus: row.current?.status ?? row.status,
      currentPeriod: row.current ? `${formatDate(row.current.planned_start)} → ${formatDate(row.current.planned_end)}` : "—",
      responsible: row.responsible,
      progress: Number(row.progress),
      progressLabel: formatPercent(row.progress),
      slackDays: row.slack,
      deadlineClass: deadline.className,
      deadlineLabel: deadline.label,
      blockedCount: row.blocked,
      nextTitle: row.next?.title ?? "—",
      plannedEnd: row.planned_end
    };
  });

  const milestones = (milestonesResult.data ?? []).map((milestone) => {
    const project = singleRelation(milestone.projects);
    return {
      id: milestone.id,
      projectId: milestone.project_id,
      projectCode: project?.code || "—",
      projectName: project?.name || "Projeto",
      title: milestone.title,
      plannedDate: milestone.planned_date,
      plannedDateLabel: formatDate(milestone.planned_date),
      completed: milestone.completed
    };
  });

  const loadFailed = Boolean(projectsResult.error || milestonesResult.error || profilesResult.error);

  return (
    <main className="content">
      <BarraDeTrabalho
        title="Planejamento"
        primaryAction={<Link className="button button-primary barra-controle-novo" href="/app/obras/novo">Novo projeto</Link>}
        meta={<span className="pipeline-contagem">{portfolioRows.length} projeto(s)</span>}
      />
      <SmartSearchBar
        initialQuery={query.q}
        initialFilters={query}
        placeholder="Buscar projeto, cliente, tarefa, responsável, contato, cidade ou bairro..."
        filters={[
          {
            name: "status",
            label: "Situação",
            type: "select",
            options: [
              { value: "PLANNING", label: "Planejamento" },
              { value: "ACTIVE", label: "Ativo" },
              { value: "IN_PROGRESS", label: "Em andamento" },
              { value: "ON_HOLD", label: "Pausado" },
              { value: "COMPLETED", label: "Concluído" }
            ]
          },
          {
            name: "entryMode",
            label: "Origem",
            type: "select",
            options: [
              { value: "CONTRACT", label: "Contrato" },
              { value: "INDEPENDENT", label: "Projeto independente" },
              { value: "IN_PROGRESS", label: "Projeto anterior em andamento" },
              { value: "HISTORICAL", label: "Histórico" },
              { value: "IMPORTED", label: "Importado" }
            ]
          },
          { name: "city", label: "Cidade", placeholder: "Campos do Jordão" },
          { name: "district", label: "Bairro", placeholder: "Capivari" }
        ]}
      />
      <p className="workspace-intro">Prazo, etapa, responsabilidade, recursos e próxima ação por projeto, inclusive sem proposta ou orçamento.</p>
      {loadFailed ? <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div> : null}
      <PlanningPortfolioView rows={portfolioRows} milestones={milestones} />
    </main>
  );
}
