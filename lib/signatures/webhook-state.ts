export const SIGNATURE_STATUS_BY_EVENT: Record<string, string> = {
  SENT: "SENT",
  VIEWED: "VIEWED",
  SIGNED: "PARTIALLY_SIGNED",
  COMPLETED: "COMPLETED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
  CANCELED: "CANCELED",
  ERROR: "ERROR"
};

// Ordem de progresso do envelope. Eventos válidos do provedor podem chegar fora
// de ordem; sem esta escala um VIEWED atrasado rebaixaria um envelope já
// COMPLETED e sobrescreveria o estado do contrato.
const PROGRESS_RANK: Record<string, number> = {
  SENT: 1,
  VIEWED: 2,
  PARTIALLY_SIGNED: 3,
  COMPLETED: 4
};

// Desfechos terminais não progridem nem regridem: uma vez concluído, recusado,
// expirado ou cancelado, o envelope não volta a andar por evento posterior.
const TERMINAL_STATUSES = new Set(["COMPLETED", "DECLINED", "EXPIRED", "CANCELED"]);

/**
 * Decide se o status trazido por um evento de webhook deve ser aplicado ao
 * envelope. Retorna false para reentrega do mesmo estado, para regressão na
 * escala de progresso e para qualquer evento posterior a um estado terminal.
 */
export function shouldApplySignatureStatus(current: string | null | undefined, next: string) {
  const from = String(current ?? "");
  if (from === next) return false;
  if (TERMINAL_STATUSES.has(from)) return false;
  const fromRank = PROGRESS_RANK[from];
  const nextRank = PROGRESS_RANK[next];
  if (fromRank !== undefined && nextRank !== undefined) return nextRank > fromRank;
  return true;
}
