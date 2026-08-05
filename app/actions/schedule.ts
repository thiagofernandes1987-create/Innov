"use server";

import { revalidatePath } from "next/cache";
import { proximoCodigo } from "@/lib/planejamento/eap";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";
import {
  isScheduleDependencyType,
  publicScheduleDatabaseMessage,
  wouldCreateScheduleCycle,
  wouldCreateTaskHierarchyCycle,
  type ScheduleDatabaseError
} from "@/lib/planejamento/schedule-validation";

const scheduleRoles = [
  "SUPER_ADMIN",
  "DIRECAO",
  "ADMINISTRADOR",
  "GESTOR_OBRAS",
  "ENGENHEIRO"
] as const;

const taskStatuses = new Set(["BACKLOG", "READY", "IN_PROGRESS", "BLOCKED", "REVIEW", "COMPLETED", "CANCELED"]);
const taskPriorities = new Set(["LOW", "NORMAL", "HIGH", "CRITICAL"]);

type ScheduleContext = Awaited<ReturnType<typeof requireOrganizationContext>>;
type ScheduleSupabase = ScheduleContext["supabase"];

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function optionalText(formData: FormData, name: string): string | null {
  const value = text(formData, name);
  return value || null;
}

function schedulePath(projectId: string): string {
  return projectId ? `/app/obras/${projectId}/cronograma` : "/app/obras";
}

function fail(projectId: string, message: string): never {
  redirect(`${schedulePath(projectId)}?error=${encodeURIComponent(message)}`);
}

function failDatabase(
  projectId: string,
  operation: string,
  error: ScheduleDatabaseError,
  fallback: string
): never {
  console.error(`[schedule.${operation}]`, {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null
  });
  fail(projectId, publicScheduleDatabaseMessage(error, fallback));
}

function optionalIsoDate(formData: FormData, name: string, projectId: string): string | null {
  const value = optionalText(formData, name);
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    fail(projectId, "Informe uma data válida.");
  }
  return value;
}

function wholeNumber(
  formData: FormData,
  name: string,
  projectId: string,
  options: { defaultValue: number; min: number; max: number; label: string }
): number {
  const raw = text(formData, name);
  if (!raw) return options.defaultValue;
  const value = Number(raw.replace(",", "."));
  if (!Number.isInteger(value) || value < options.min || value > options.max) {
    fail(projectId, `${options.label} deve ser um número inteiro entre ${options.min} e ${options.max}.`);
  }
  return value;
}

function validatePeriod(projectId: string, start: string | null, end: string | null): void {
  if (start && end && end < start) {
    fail(projectId, "A data de término não pode ser anterior à data de início.");
  }
}

function revalidateSchedule(projectId: string): void {
  revalidatePath(schedulePath(projectId));
  revalidatePath(`/app/obras/${projectId}/eap`);
  revalidatePath(`/app/obras/${projectId}/tarefas`);
}


/**
 * Código da EAP calculado, não digitado.
 *
 * "se já temos na tabela salvo o sequenciamento dos itens por que toda vez
 * fazer o usuário digitar?" — a pergunta é justa. O sistema conhece os irmãos,
 * então conhece o próximo número. O campo continua aceitando valor manual para
 * quem precisa espelhar uma EAP contratual que já existe em papel; o que muda é
 * que **vazio não é mais erro**.
 */
async function codigoDaEtapa(
  supabase: Awaited<ReturnType<typeof requireOrganizationContext>>["supabase"],
  projectId: string,
  parentId: string | null,
  informado: string
): Promise<string> {
  if (informado) return informado;
  const { data } = await supabase
    .from("work_breakdown_items")
    .select("id,code")
    .eq("project_id", projectId);
  const codigos = (data ?? []).map(linha => String(linha.code ?? ""));
  let paiCodigo: string | null = null;
  if (parentId) {
    const pai = (data ?? []).find(linha => linha.id === parentId);
    paiCodigo = pai ? String(pai.code ?? "") : null;
  }
  return proximoCodigo(codigos, paiCodigo);
}

/** Mesma regra para atividade: numera dentro da etapa da EAP quando há uma. */
async function codigoDaAtividade(
  supabase: Awaited<ReturnType<typeof requireOrganizationContext>>["supabase"],
  projectId: string,
  wbsId: string | null,
  informado: string
): Promise<string> {
  if (informado) return informado;
  const [tarefas, etapas] = await Promise.all([
    supabase.from("project_tasks").select("code").eq("project_id", projectId),
    wbsId
      ? supabase.from("work_breakdown_items").select("code").eq("id", wbsId).maybeSingle()
      : Promise.resolve({ data: null })
  ]);
  const codigos = (tarefas.data ?? []).map(linha => String(linha.code ?? ""));
  const paiCodigo = etapas.data ? String((etapas.data as { code?: string }).code ?? "") : null;
  return proximoCodigo(codigos, paiCodigo || null);
}

export async function createScheduleWbs(formData: FormData) {
  const projectId = text(formData, "projectId");
  const code = text(formData, "code").toUpperCase();
  const title = text(formData, "title");
  const parentId = optionalText(formData, "parentId");
  const plannedStart = optionalIsoDate(formData, "plannedStart", projectId);
  const plannedEnd = optionalIsoDate(formData, "plannedEnd", projectId);
  const sequence = wholeNumber(formData, "sequence", projectId, {
    defaultValue: 0,
    min: 0,
    max: 1_000_000,
    label: "A ordem"
  });

  if (!projectId || !title) fail(projectId, "Informe o nome da etapa da EAP.");
  validatePeriod(projectId, plannedStart, plannedEnd);

  const { supabase, organizationId, userId } = await requireOrganizationContext(scheduleRoles);
  const parentId = optionalText(formData, "parentId");
  const { data: criada, error } = await supabase
    .from("work_breakdown_items")
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      parent_id: parentId,
      code: await codigoDaEtapa(supabase, projectId, parentId, code),
      title,
      description: optionalText(formData, "description"),
      sequence: optionalNumber(formData, "sequence") ?? 0,
      planned_start: plannedStart,
      planned_end: plannedEnd,
      client_visible: true,
      created_by: userId
    })
    .select("id")
    .maybeSingle();

  if (error) fail(projectId, error.message);
  // Depois de gravar, e só depois: valor que o usuário digitou e abandonou não
  // é vocabulário da empresa, e entraria na lista de todo mundo.
  await registrarValorUsado(supabase, organizationId, ESCOPOS.etapaDaEap, title);
  await criarAtividadesDoModelo(supabase, formData, {
    projectId,
    organizationId,
    userId,
    wbsId: criada?.id ? String(criada.id) : null
  });
  revalidateSchedule(projectId);
}

/**
 * As atividades que vieram do modelo de EAP, criadas junto com a etapa.
 *
 * **Nada acontece sem marcação explícita.** O formulário manda uma linha por
 * atividade escolhida; sem escolha, a etapa nasce vazia como sempre nasceu.
 * Trazer por padrão transformaria sugestão em imposição, e a EAP de quem não
 * quis o modelo nasceria com cinco linhas para apagar.
 *
 * Falha de uma atividade não derruba a etapa: a etapa já está gravada, e
 * desfazer o que deu certo por causa do que não deu deixaria a pessoa sem
 * nenhum dos dois.
 */
async function criarAtividadesDoModelo(
  supabase: Awaited<ReturnType<typeof requireOrganizationContext>>["supabase"],
  formData: FormData,
  contexto: { projectId: string; organizationId: string; userId: string; wbsId: string | null }
): Promise<void> {
  const escolhidas = formData
    .getAll("atividadeDoModelo")
    .map(valor => String(valor).trim())
    .filter(Boolean);
  if (escolhidas.length === 0) return;

  const codigosExistentes = await supabase
    .from("project_tasks")
    .select("code")
    .eq("project_id", contexto.projectId);
  const codigos = (codigosExistentes.data ?? []).map(linha => String(linha.code ?? ""));

  const { data: etapa } = contexto.wbsId
    ? await supabase.from("work_breakdown_items").select("code").eq("id", contexto.wbsId).maybeSingle()
    : { data: null };
  const paiCodigo = etapa ? String((etapa as { code?: string }).code ?? "") : null;

  // Numera em sequência, acumulando: `proximoCodigo` olha para a lista de
  // códigos existentes, e sem devolver a ela o código recém-atribuído as cinco
  // atividades receberiam o mesmo número.
  const atribuidos = [...codigos];
  const linhas = escolhidas.map((title, indice) => {
    const code = proximoCodigo(atribuidos, paiCodigo || null);
    atribuidos.push(code);
    return {
      organization_id: contexto.organizationId,
      project_id: contexto.projectId,
      wbs_id: contexto.wbsId,
      code,
      title,
      status: "BACKLOG",
      priority: "NORMAL",
      sequence: indice,
      duration_days: 1,
      progress: 0,
      client_visible: true,
      created_by: contexto.userId
    };
  });

  const { error } = await supabase.from("project_tasks").insert(linhas);
  if (error) {
    console.error("[eap:modelo]", error.message);
    return;
  }
  for (const title of escolhidas) {
    await registrarValorUsado(supabase, contexto.organizationId, ESCOPOS.atividadeDaEap, title);
  }
}

export async function createScheduleTask(formData: FormData) {
  const projectId = text(formData, "projectId");
  const code = text(formData, "code").toUpperCase();
  const title = text(formData, "title");
  const wbsId = optionalText(formData, "wbsId");
  const parentTaskId = optionalText(formData, "parentTaskId");
  const plannedStart = optionalIsoDate(formData, "plannedStart", projectId);
  const plannedEnd = optionalIsoDate(formData, "plannedEnd", projectId);
  const durationDays = wholeNumber(formData, "durationDays", projectId, {
    defaultValue: 1,
    min: 1,
    max: 36_500,
    label: "A duração"
  });
  const sequence = wholeNumber(formData, "sequence", projectId, {
    defaultValue: 0,
    min: 0,
    max: 1_000_000,
    label: "A ordem"
  });

  if (!projectId || !title) fail(projectId, "Informe o nome da atividade.");
  if (durationDays < 0) fail(projectId, "A duração não pode ser negativa.");
  validatePeriod(projectId, plannedStart, plannedEnd);

  const { supabase, organizationId, userId } = await requireOrganizationContext(scheduleRoles);
  const wbsId = optionalText(formData, "wbsId");
  const { error } = await supabase.from("project_tasks").insert({
    organization_id: organizationId,
    project_id: projectId,
    wbs_id: wbsId,
    parent_task_id: optionalText(formData, "parentTaskId"),
    code: await codigoDaAtividade(supabase, projectId, wbsId, code),
    title,
    description: optionalText(formData, "description"),
    status: "BACKLOG",
    priority: "NORMAL",
    sequence,
    planned_start: plannedStart,
    planned_end: plannedEnd,
    duration_days: durationDays,
    progress: 0,
    client_visible: true,
    created_by: userId
  });

  if (error) fail(projectId, error.message);
  await registrarValorUsado(supabase, organizationId, ESCOPOS.atividadeDaEap, title);
  revalidateSchedule(projectId);
}

export async function updateScheduleTask(formData: FormData) {
  const projectId = text(formData, "projectId");
  const taskId = text(formData, "taskId");
  const code = text(formData, "code").toUpperCase();
  const title = text(formData, "title");
  const wbsId = optionalText(formData, "wbsId");
  const parentTaskId = optionalText(formData, "parentTaskId");
  const plannedStart = optionalIsoDate(formData, "plannedStart", projectId);
  const plannedEnd = optionalIsoDate(formData, "plannedEnd", projectId);
  const durationDays = wholeNumber(formData, "durationDays", projectId, {
    defaultValue: 1,
    min: 1,
    max: 36_500,
    label: "A duração"
  });
  const progressPercent = wholeNumber(formData, "progressPercent", projectId, {
    defaultValue: 0,
    min: 0,
    max: 100,
    label: "O avanço"
  });
  const sequence = wholeNumber(formData, "sequence", projectId, {
    defaultValue: 0,
    min: 0,
    max: 1_000_000,
    label: "A ordem"
  });
  const status = text(formData, "status") || "BACKLOG";
  const priority = text(formData, "priority") || "NORMAL";

  if (!projectId || !taskId || !code || !title) fail(projectId, "A atividade está incompleta.");
  if (!taskStatuses.has(status)) fail(projectId, "O status selecionado é inválido.");
  if (!taskPriorities.has(priority)) fail(projectId, "A prioridade selecionada é inválida.");
  validatePeriod(projectId, plannedStart, plannedEnd);

  const { supabase, organizationId } = await requireOrganizationContext(scheduleRoles);
  await validateTaskPlacement(supabase, organizationId, projectId, taskId, wbsId, parentTaskId);

  const { data, error } = await supabase
    .from("project_tasks")
    .update({
      wbs_id: wbsId,
      parent_task_id: parentTaskId,
      code,
      title,
      description: optionalText(formData, "description"),
      status,
      priority,
      sequence,
      planned_start: plannedStart,
      planned_end: plannedEnd,
      duration_days: durationDays,
      progress: progressPercent / 100,
      updated_at: new Date().toISOString()
    })
    .eq("id", taskId)
    .eq("project_id", projectId)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error) failDatabase(projectId, "update-task", error, "Não foi possível salvar a atividade.");
  if (!data) fail(projectId, "A atividade não existe mais ou não pertence a esta obra.");
  revalidateSchedule(projectId);
}

export async function createScheduleDependency(formData: FormData) {
  const projectId = text(formData, "projectId");
  const predecessorTaskId = text(formData, "predecessorTaskId");
  const successorTaskId = text(formData, "successorTaskId");
  const dependencyType = text(formData, "dependencyType") || "FS";
  const lagDays = wholeNumber(formData, "lagDays", projectId, {
    defaultValue: 0,
    min: -3_650,
    max: 3_650,
    label: "A defasagem"
  });

  if (!projectId || !predecessorTaskId || !successorTaskId) {
    fail(projectId, "Selecione a atividade predecessora e a sucessora.");
  }
  if (!isScheduleDependencyType(dependencyType)) fail(projectId, "O tipo de dependência é inválido.");
  if (predecessorTaskId === successorTaskId) fail(projectId, "Uma atividade não pode depender dela mesma.");

  const { supabase, organizationId, userId } = await requireOrganizationContext(scheduleRoles);
  const [{ data: tasks, error: tasksError }, { data: dependencies, error: dependenciesError }] = await Promise.all([
    supabase
      .from("project_tasks")
      .select("id")
      .eq("project_id", projectId)
      .eq("organization_id", organizationId)
      .in("id", [predecessorTaskId, successorTaskId]),
    supabase
      .from("task_dependencies")
      .select("predecessor_task_id,successor_task_id")
      .eq("project_id", projectId)
      .eq("organization_id", organizationId)
  ]);

  if (tasksError) failDatabase(projectId, "validate-dependency-tasks", tasksError, "Não foi possível validar as atividades selecionadas.");
  if (dependenciesError) failDatabase(projectId, "validate-dependency-graph", dependenciesError, "Não foi possível validar a rede de dependências.");
  if ((tasks ?? []).length !== 2) fail(projectId, "As duas atividades devem pertencer a esta obra.");

  const edges = (dependencies ?? []).map(dependency => ({
    predecessorId: dependency.predecessor_task_id,
    successorId: dependency.successor_task_id
  }));
  if (edges.some(edge => edge.predecessorId === predecessorTaskId && edge.successorId === successorTaskId)) {
    fail(projectId, "Essa relação entre as atividades já está cadastrada.");
  }
  if (wouldCreateScheduleCycle(edges, predecessorTaskId, successorTaskId)) {
    fail(projectId, "A relação criaria um ciclo no cronograma e não foi salva.");
  }

  const { error } = await supabase.from("task_dependencies").insert({
    organization_id: organizationId,
    project_id: projectId,
    predecessor_task_id: predecessorTaskId,
    successor_task_id: successorTaskId,
    dependency_type: dependencyType,
    lag_days: lagDays,
    created_by: userId
  });

  if (error) failDatabase(projectId, "create-dependency", error, "Não foi possível adicionar a dependência.");
  revalidateSchedule(projectId);
}

export async function deleteScheduleDependency(formData: FormData) {
  const projectId = text(formData, "projectId");
  const dependencyId = text(formData, "dependencyId");
  if (!projectId || !dependencyId) fail(projectId, "Relação de dependência inválida.");

  const { supabase, organizationId } = await requireOrganizationContext(scheduleRoles);
  const { data, error } = await supabase
    .from("task_dependencies")
    .delete()
    .eq("id", dependencyId)
    .eq("project_id", projectId)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error) failDatabase(projectId, "delete-dependency", error, "Não foi possível remover a dependência.");
  if (!data) fail(projectId, "A dependência não existe mais ou não pertence a esta obra.");
  revalidateSchedule(projectId);
}
