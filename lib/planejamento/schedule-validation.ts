export const SCHEDULE_DEPENDENCY_TYPES = ["FS", "SS", "FF", "SF"] as const;
export type ScheduleDependencyType = (typeof SCHEDULE_DEPENDENCY_TYPES)[number];

export type ScheduleEdge = {
  predecessorId: string;
  successorId: string;
};

export type ScheduleDatabaseError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export function isScheduleDependencyType(value: string): value is ScheduleDependencyType {
  return SCHEDULE_DEPENDENCY_TYPES.includes(value as ScheduleDependencyType);
}

/**
 * Verifica a inclusão de uma aresta antes da persistência.
 * Uma relação predecessor -> sucessor fecha ciclo quando o predecessor já é
 * alcançável a partir do sucessor.
 */
export function wouldCreateScheduleCycle(
  edges: ScheduleEdge[],
  predecessorId: string,
  successorId: string
): boolean {
  if (predecessorId === successorId) return true;

  const successorsByTask = new Map<string, string[]>();
  for (const edge of edges) {
    const list = successorsByTask.get(edge.predecessorId) ?? [];
    list.push(edge.successorId);
    successorsByTask.set(edge.predecessorId, list);
  }

  const pending = [successorId];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    if (current === predecessorId) return true;
    visited.add(current);
    pending.push(...(successorsByTask.get(current) ?? []));
  }

  return false;
}

/**
 * Impede transformar a própria tarefa ou um descendente em tarefa superior.
 */
export function wouldCreateTaskHierarchyCycle(
  parentByTask: Map<string, string | null>,
  taskId: string,
  newParentId: string | null
): boolean {
  if (!newParentId) return false;
  if (newParentId === taskId) return true;

  const visited = new Set<string>();
  let current: string | null = newParentId;
  while (current) {
    if (current === taskId) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    current = parentByTask.get(current) ?? null;
  }
  return false;
}

/** Nunca devolve `message`, `details` ou `hint` do Postgres ao navegador. */
export function publicScheduleDatabaseMessage(
  error: ScheduleDatabaseError | null | undefined,
  fallback: string
): string {
  switch (error?.code) {
    case "23505":
      return "Já existe um registro com os mesmos dados neste cronograma.";
    case "23503":
      return "Um dos registros relacionados não existe mais. Atualize a página e tente novamente.";
    case "23514":
      return "Os dados informados não atendem às regras do cronograma.";
    case "42501":
    case "PGRST301":
      return "Você não tem permissão para realizar esta alteração.";
    default:
      return fallback;
  }
}
