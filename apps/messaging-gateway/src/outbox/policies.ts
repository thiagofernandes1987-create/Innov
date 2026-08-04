import type {
  DeliveryCircuitBreaker,
  DeliveryCircuitState,
  DeliveryRateLimiter,
  ProviderDeliveryFailure
} from "./contracts.js";

export function boundedDeliveryBackoffMs(
  attemptNumber: number,
  options: { baseMs?: number; maxMs?: number; jitterRatio?: number; random?: () => number } = {}
): number {
  const baseMs = options.baseMs ?? 1_000;
  const maxMs = options.maxMs ?? 120_000;
  const jitterRatio = options.jitterRatio ?? 0.2;
  const random = options.random ?? Math.random;
  const exponential = Math.min(maxMs, baseMs * 2 ** Math.max(0, attemptNumber - 1));
  const jitter = exponential * jitterRatio * (random() * 2 - 1);
  return Math.max(baseMs, Math.min(maxMs, Math.round(exponential + jitter)));
}

export class InMemoryDeliveryCircuitBreaker implements DeliveryCircuitBreaker {
  private readonly records = new Map<string, {
    state: DeliveryCircuitState;
    failures: number;
    openedUntil: number;
  }>();

  constructor(
    private readonly threshold = 3,
    private readonly openMs = 30_000
  ) {}

  allow(accountId: string, now: string): boolean {
    const record = this.records.get(accountId);
    if (!record || record.state === "CLOSED") return true;
    if (record.state === "OPEN" && Date.parse(now) >= record.openedUntil) {
      record.state = "HALF_OPEN";
      return true;
    }
    return record.state === "HALF_OPEN";
  }

  success(accountId: string): void {
    this.records.set(accountId, { state: "CLOSED", failures: 0, openedUntil: 0 });
  }

  failure(accountId: string, failure: ProviderDeliveryFailure, now: string): void {
    if (!failure.retryable) return;
    const record = this.records.get(accountId) ?? {
      state: "CLOSED" as DeliveryCircuitState,
      failures: 0,
      openedUntil: 0
    };
    record.failures += 1;
    if (record.failures >= this.threshold || record.state === "HALF_OPEN") {
      record.state = "OPEN";
      record.openedUntil = Date.parse(now) + this.openMs;
    }
    this.records.set(accountId, record);
  }

  state(accountId: string): DeliveryCircuitState {
    return this.records.get(accountId)?.state ?? "CLOSED";
  }
}

export class FixedWindowDeliveryRateLimiter implements DeliveryRateLimiter {
  private readonly buckets = new Map<string, { window: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs = 60_000
  ) {
    if (limit < 1) throw new Error("RATE_LIMIT_MUST_BE_POSITIVE");
  }

  reserve(organizationId: string, accountId: string, now: string): boolean {
    const timestamp = Date.parse(now);
    const window = Math.floor(timestamp / this.windowMs);
    const key = `${organizationId}:${accountId}`;
    const current = this.buckets.get(key);
    if (!current || current.window !== window) {
      this.buckets.set(key, { window, count: 1 });
      return true;
    }
    if (current.count >= this.limit) return false;
    current.count += 1;
    return true;
  }
}
