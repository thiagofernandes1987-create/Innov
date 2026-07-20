export const taskColumns = [
  ["BACKLOG", "Backlog"],
  ["READY", "Prontas"],
  ["IN_PROGRESS", "Em execução"],
  ["BLOCKED", "Bloqueadas"],
  ["REVIEW", "Em revisão"],
  ["COMPLETED", "Concluídas"]
] as const;

export const taskStatusLabels: Record<string, string> = Object.fromEntries(taskColumns);
export const dailyLogStatusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  SUBMITTED: "Enviado",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado"
};

export function formatPercent(value: number | string | null | undefined, digits = 0) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(number);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}

export function daysBetween(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null;
  return Math.round((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000);
}

export function statusBadge(status: string) {
  if (["COMPLETED", "APPROVED", "ACTIVE", "RELEASED"].includes(status)) return "badge badge-success";
  if (["BLOCKED", "REJECTED", "CANCELED"].includes(status)) return "badge badge-danger";
  if (["IN_PROGRESS", "SUBMITTED", "REVIEW", "PLANNING"].includes(status)) return "badge badge-warning";
  return "badge";
}
