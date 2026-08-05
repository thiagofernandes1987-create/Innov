import "server-only";

import type { OrganizationContext } from "@/lib/auth";
import {
  clampProgress,
  formatCompactCurrency,
  formatCompactNumber,
  type LauncherRecentItem,
  type LauncherSummaryMap,
  unavailableSummary
} from "./launcher-domain";

type SupabaseClient = OrganizationContext & {
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>>;
};
type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === "object") as Row[] : [];
}
function first(value: unknown): Row | null {
  if (Array.isArray(value)) return value[0] && typeof value[0] === "object" ? value[0] as Row : null;
  return value && typeof value === "object" ? value as Row : null;
}
function numeric(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function failed(result: { error: unknown }): boolean {
  return Boolean(result.error);
}
function recentOpportunities(collection: Row[]): LauncherRecentItem[] {
  return collection.slice(0, 3).map(item => ({
    id: String(item.id),
    title: String(item.title ?? item.code ?? "Oportunidade"),
    subtitle: String(item.stage ?? "Pipeline comercial"),
    meta: formatCompactCurrency(numeric(item.estimated_value)),
    href: `/app/crm/oportunidades/${String(item.id)}`
  }));
}
function baseUnavailable(): LauncherSummaryMap {
  return {
    crm: unavailableSummary("Oportunidades ativas"),
    clientes: unavailableSummary("Clientes ativos"),
    obras: unavailableSummary("Obras em andamento"),
    planejamento: unavailableSummary("Baselines e marcos"),
    tarefas: unavailableSummary("Tarefas em aberto"),
    diario: unavailableSummary("Registros de obra"),
    equipes: unavailableSummary("Equipes e recursos"),
    orcamentos: unavailableSummary("Orçamentos"),
    propostas: unavailableSummary("Propostas"),
    contratos: unavailableSummary("Contratos"),
    documentos: unavailableSummary("Documentos")
  };
}

export async function loadLauncherSummaries(context: SupabaseClient): Promise<LauncherSummaryMap> {
  const { supabase, organizationId } = context;
  const today = new Date().toISOString().slice(0, 10);
  const [
    leadsResult, opportunitiesResult, clientsResult, projectsResult,
    baselinesResult, milestonesResult, tasksResult, dailyLogsResult,
    teamsResult, membersResult, resourcesResult, budgetsResult,
    proposalsResult, contractsResult, documentsResult
  ] = await Promise.all([
    supabase.from("crm_leads").select("id,stage").eq("organization_id", organizationId).is("archived_at", null),
    supabase.from("opportunities").select("id,code,title,stage,estimated_value,created_at").eq("organization_id", organizationId).is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("clients").select("id,status").eq("organization_id", organizationId).is("archived_at", null),
    supabase.from("projects").select("id,status,progress").eq("organization_id", organizationId).is("archived_at", null),
    supabase.from("schedule_baselines").select("id,status").eq("organization_id", organizationId),
    supabase.from("project_milestones").select("id,planned_date,completed").eq("organization_id", organizationId),
    supabase.from("project_tasks").select("id,status,planned_end").eq("organization_id", organizationId),
    supabase.from("daily_logs").select("id,log_date,status,projects(code,name)", { count: "exact" }).eq("organization_id", organizationId).order("log_date", { ascending: false }).limit(1),
    supabase.from("project_teams").select("id,active").eq("organization_id", organizationId),
    supabase.from("project_team_members").select("id,active").eq("organization_id", organizationId),
    supabase.from("project_resources").select("id,active,resource_type").eq("organization_id", organizationId),
    supabase.from("budgets").select("id,status,budget_versions!budgets_current_version_fk(sale_price)").eq("organization_id", organizationId),
    supabase.from("proposals").select("id,status,proposal_versions!proposals_current_version_fk(sale_price,discount_status)").eq("organization_id", organizationId),
    supabase.from("contracts").select("id,status").eq("organization_id", organizationId),
    supabase.from("project_documents").select("id,status").eq("organization_id", organizationId)
  ]);

  const summaries = baseUnavailable();

  if (!failed(leadsResult) && !failed(opportunitiesResult)) {
    const leads = rows(leadsResult.data);
    const opportunities = rows(opportunitiesResult.data);
    const pipelineValue = opportunities.reduce((sum, item) => sum + numeric(item.estimated_value), 0);
    const won = opportunities.filter(item => String(item.stage) === "WON").length;
    summaries.crm = {
      label: "Oportunidades ativas", value: formatCompactNumber(opportunities.length),
      support: `${formatCompactCurrency(pipelineValue)} no pipeline`, secondaryLabel: "Leads",
      secondaryValue: formatCompactNumber(leads.length),
      progress: clampProgress(opportunities.length ? won / opportunities.length * 100 : 0),
      recent: recentOpportunities(opportunities), available: true
    };
  }

  if (!failed(clientsResult)) {
    const clients = rows(clientsResult.data);
    const active = clients.filter(item => String(item.status ?? "ACTIVE") === "ACTIVE").length;
    summaries.clientes = { label: "Clientes ativos", value: formatCompactNumber(active), support: `${formatCompactNumber(clients.length)} cadastrados`, progress: clampProgress(clients.length ? active / clients.length * 100 : 0), available: true };
  }

  if (!failed(projectsResult)) {
    const projects = rows(projectsResult.data);
    const active = projects.filter(item => !["COMPLETED", "CANCELED", "ARCHIVED"].includes(String(item.status ?? ""))).length;
    const average = projects.length ? projects.reduce((sum, item) => sum + numeric(item.progress), 0) / projects.length : 0;
    summaries.obras = { label: "Obras em andamento", value: formatCompactNumber(active), support: `${formatCompactNumber(projects.length)} na carteira`, progress: clampProgress(average * 100), available: true };
  }

  if (!failed(baselinesResult) && !failed(milestonesResult)) {
    const baselines = rows(baselinesResult.data);
    const milestones = rows(milestonesResult.data);
    const upcoming = milestones.filter(item => !item.completed && String(item.planned_date ?? "") >= today).length;
    const frozen = baselines.filter(item => String(item.status) === "FROZEN").length;
    summaries.planejamento = { label: "Cronogramas controlados", value: formatCompactNumber(baselines.length), support: `${upcoming} marco(s) futuro(s)`, secondaryLabel: "Baselines congeladas", secondaryValue: formatCompactNumber(frozen), progress: clampProgress(baselines.length ? frozen / baselines.length * 100 : 0), available: true };
  }

  if (!failed(tasksResult)) {
    const tasks = rows(tasksResult.data);
    const open = tasks.filter(item => !["COMPLETED", "CANCELED"].includes(String(item.status))).length;
    const overdue = tasks.filter(item => !["COMPLETED", "CANCELED"].includes(String(item.status)) && item.planned_end && String(item.planned_end) < today).length;
    summaries.tarefas = { label: "Tarefas em aberto", value: formatCompactNumber(open), support: `${overdue} atrasada(s)`, progress: clampProgress(open ? (open - overdue) / open * 100 : 100), available: true };
  }

  if (!failed(dailyLogsResult)) {
    const latest = rows(dailyLogsResult.data)[0];
    const project = first(latest?.projects);
    summaries.diario = { label: "Registros de obra", value: formatCompactNumber(Number(dailyLogsResult.count ?? 0)), support: latest ? `Último em ${new Intl.DateTimeFormat("pt-BR").format(new Date(`${String(latest.log_date)}T12:00:00`))}` : "Nenhum registro", secondaryLabel: project ? String(project.code ?? "Obra") : null, secondaryValue: project ? String(project.name ?? "") : null, progress: latest ? 100 : 0, available: true };
  }

  if (!failed(teamsResult) && !failed(membersResult) && !failed(resourcesResult)) {
    const teams = rows(teamsResult.data);
    const members = rows(membersResult.data);
    const resources = rows(resourcesResult.data);
    const activeTeams = teams.filter(item => item.active !== false).length;
    const activeMembers = members.filter(item => item.active !== false).length;
    const activeResources = resources.filter(item => item.active !== false).length;
    summaries.equipes = { label: "Pessoas alocadas", value: formatCompactNumber(activeMembers), support: `${activeTeams} equipe(s) ativa(s)`, secondaryLabel: "Recursos ativos", secondaryValue: formatCompactNumber(activeResources), progress: clampProgress(teams.length ? activeTeams / teams.length * 100 : 0), available: true };
  }

  if (!failed(budgetsResult)) {
    const budgets = rows(budgetsResult.data);
    const total = budgets.reduce((sum, item) => sum + numeric(first(item.budget_versions)?.sale_price), 0);
    const pending = budgets.filter(item => String(item.status) === "APPROVAL_PENDING").length;
    summaries.orcamentos = { label: "Orçamentos na carteira", value: formatCompactNumber(budgets.length), support: `${formatCompactCurrency(total)} orçados`, secondaryLabel: "Aprovação pendente", secondaryValue: formatCompactNumber(pending), progress: clampProgress(budgets.length ? (budgets.length - pending) / budgets.length * 100 : 0), available: true };
  }

  if (!failed(proposalsResult)) {
    const proposals = rows(proposalsResult.data);
    const sent = proposals.filter(item => ["SENT", "VIEWED", "ACCEPTED", "CONVERTED"].includes(String(item.status))).length;
    const pendingDiscount = proposals.filter(item => String(first(item.proposal_versions)?.discount_status) === "PENDING").length;
    summaries.propostas = { label: "Propostas", value: formatCompactNumber(proposals.length), support: `${sent} enviada(s) ou concluída(s)`, secondaryLabel: "Descontos pendentes", secondaryValue: formatCompactNumber(pendingDiscount), progress: clampProgress(proposals.length ? sent / proposals.length * 100 : 0), available: true };
  }

  if (!failed(contractsResult)) {
    const contracts = rows(contractsResult.data);
    const active = contracts.filter(item => ["SIGNED", "ACTIVE", "AMENDED"].includes(String(item.status))).length;
    summaries.contratos = { label: "Contratos ativos", value: formatCompactNumber(active), support: `${formatCompactNumber(contracts.length)} no histórico`, progress: clampProgress(contracts.length ? active / contracts.length * 100 : 0), available: true };
  }

  if (!failed(documentsResult)) {
    const documents = rows(documentsResult.data);
    const released = documents.filter(item => String(item.status) === "RELEASED").length;
    summaries.documentos = { label: "Documentos", value: formatCompactNumber(documents.length), support: `${released} liberado(s)`, progress: clampProgress(documents.length ? released / documents.length * 100 : 0), available: true };
  }

  return summaries;
}
