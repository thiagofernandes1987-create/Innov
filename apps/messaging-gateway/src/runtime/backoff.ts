export type ReconnectBackoffInput = {
  attempt: number;
  baseMs?: number;
  maxMs?: number;
  jitterRatio?: number;
  random?: () => number;
};

export function reconnectBackoffMs(input: ReconnectBackoffInput): number {
  const baseMs = input.baseMs ?? 1_000;
  const maxMs = input.maxMs ?? 60_000;
  const jitterRatio = input.jitterRatio ?? 0.2;
  const random = input.random ?? Math.random;

  if (!Number.isSafeInteger(input.attempt) || input.attempt < 1) {
    throw new RangeError("Reconnect attempt deve ser inteiro positivo.");
  }
  if (!Number.isFinite(baseMs) || baseMs <= 0 || !Number.isFinite(maxMs) || maxMs < baseMs) {
    throw new RangeError("Limites de backoff inválidos.");
  }
  if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 1) {
    throw new RangeError("Jitter deve estar entre zero e um.");
  }

  const exponential = Math.min(maxMs, baseMs * 2 ** Math.min(input.attempt - 1, 30));
  const boundedRandom = Math.min(1, Math.max(0, random()));
  const jitterMultiplier = 1 - jitterRatio + boundedRandom * jitterRatio * 2;
  return Math.max(1, Math.min(maxMs, Math.round(exponential * jitterMultiplier)));
}
