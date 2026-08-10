import type {
  DeliveryCircuitBreaker,
  DeliveryProvider,
  DeliveryRateLimiter,
  DeliveryRepository,
  ProviderDeliveryFailure
} from "./contracts.js";
import { boundedDeliveryBackoffMs } from "./policies.js";

export type DeliveryWorkerOptions = {
  workerId: string;
  repository: DeliveryRepository;
  provider: DeliveryProvider;
  circuitBreaker: DeliveryCircuitBreaker;
  rateLimiter: DeliveryRateLimiter;
  now?: () => Date;
  random?: () => number;
  maxAttempts?: number;
};

export function normalizeDeliveryFailure(error: unknown): ProviderDeliveryFailure {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "retryable" in error
  ) {
    const candidate = error as Partial<ProviderDeliveryFailure>;
    return {
      code: String(candidate.code ?? "UNKNOWN_PROVIDER_ERROR"),
      classification: candidate.classification ?? "UNKNOWN",
      retryable: Boolean(candidate.retryable),
      message: String(candidate.message ?? "Falha de entrega provider-neutral.")
    };
  }
  return {
    code: "UNKNOWN_PROVIDER_ERROR",
    classification: "UNKNOWN",
    retryable: true,
    message: error instanceof Error ? error.message : "Falha de entrega desconhecida."
  };
}

export function createDeliveryWorker(options: DeliveryWorkerOptions) {
  const now = options.now ?? (() => new Date());
  const maxAttempts = options.maxAttempts ?? 5;

  return {
    async runOnce(limit = 20): Promise<{
      claimed: number;
      succeeded: number;
      retried: number;
      terminal: number;
      rateLimited: number;
      circuitOpen: number;
    }> {
      const claims = await options.repository.claimOrdered(options.workerId, limit);
      const summary = {
        claimed: claims.length,
        succeeded: 0,
        retried: 0,
        terminal: 0,
        rateLimited: 0,
        circuitOpen: 0
      };

      for (const claim of claims) {
        const timestamp = now().toISOString();
        const accountId = claim.command.channelAccountId;
        if (!options.circuitBreaker.allow(accountId, timestamp)) {
          const failure: ProviderDeliveryFailure = {
            code: "CIRCUIT_OPEN",
            classification: "TRANSIENT",
            retryable: true,
            message: "Circuit breaker aberto para a conta."
          };
          const nextAttemptAt = new Date(
            Date.parse(timestamp) + boundedDeliveryBackoffMs(claim.attemptNumber, { random: options.random })
          ).toISOString();
          await options.repository.fail(claim, failure, nextAttemptAt);
          summary.circuitOpen += 1;
          continue;
        }

        if (!options.rateLimiter.reserve(
          claim.command.organizationId,
          accountId,
          timestamp
        )) {
          const failure: ProviderDeliveryFailure = {
            code: "ORGANIZATION_SESSION_RATE_LIMIT",
            classification: "RATE_LIMIT",
            retryable: true,
            message: "Limite de volume da organização/sessão atingido."
          };
          const nextAttemptAt = new Date(
            Date.parse(timestamp) + boundedDeliveryBackoffMs(claim.attemptNumber, { random: options.random })
          ).toISOString();
          await options.repository.fail(claim, failure, nextAttemptAt);
          summary.rateLimited += 1;
          continue;
        }

        try {
          const result = await options.provider.send(claim.command);
          await options.repository.complete(claim, result);
          options.circuitBreaker.success(accountId);
          summary.succeeded += 1;
        } catch (error) {
          const failure = normalizeDeliveryFailure(error);
          const retryable = failure.retryable && claim.attemptNumber < maxAttempts;
          const normalized = { ...failure, retryable };
          const nextAttemptAt = retryable
            ? new Date(
              Date.parse(timestamp) + boundedDeliveryBackoffMs(claim.attemptNumber, {
                random: options.random
              })
            ).toISOString()
            : null;
          await options.repository.fail(claim, normalized, nextAttemptAt);
          options.circuitBreaker.failure(accountId, normalized, timestamp);
          if (retryable) summary.retried += 1;
          else summary.terminal += 1;
        }
      }
      return summary;
    },

    async reconcile(): Promise<number> {
      return options.repository.reconcile(now().toISOString());
    }
  };
}
