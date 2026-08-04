import { describe, expect, it, vi } from "vitest";
import {
  FixedWindowDeliveryRateLimiter,
  InMemoryDeliveryCircuitBreaker,
  InMemoryDeliveryRepository,
  boundedDeliveryBackoffMs,
  createDeliveryWorker,
  normalizeDeliveryFailure,
  type CanonicalDeliveryCommand,
  type DeliveryProvider
} from "../apps/messaging-gateway/src/outbox/index.js";

function command(
  id: string,
  sequenceNumber: number,
  overrides: Partial<CanonicalDeliveryCommand> = {}
): CanonicalDeliveryCommand {
  return {
    schemaVersion: "1.0.0",
    commandId: id,
    organizationId: "org-1",
    channelAccountId: "account-1",
    conversationId: "conversation-1",
    messageId: `message-${id}`,
    providerType: "WHATSAPP_WEB_BAILEYS",
    providerAccountId: "provider-account-1",
    idempotencyKey: `idempotency-${id}`,
    sequenceNumber,
    payloadSha256: "a".repeat(64),
    payload: { text: `fixture-${id}` },
    createdAt: `2026-08-04T15:00:0${sequenceNumber}.000Z`,
    ...overrides
  };
}

class QueueProvider implements DeliveryProvider {
  readonly sent: string[] = [];
  readonly outcomes: Array<"SUCCESS" | Error> = [];

  async send(input: CanonicalDeliveryCommand) {
    this.sent.push(input.commandId);
    const outcome = this.outcomes.shift() ?? "SUCCESS";
    if (outcome instanceof Error) throw outcome;
    return {
      providerMessageId: `provider-${input.commandId}`,
      acceptedAt: "2026-08-04T15:01:00.000Z",
      metadata: { synthetic: true }
    };
  }
}

describe("Messaging outbox W-10", () => {
  it("enqueue é idempotente", () => {
    const repository = new InMemoryDeliveryRepository();
    const first = repository.enqueue(command("1", 1));
    const repeated = repository.enqueue(command("other", 99, {
      idempotencyKey: first.idempotencyKey
    }));
    expect(repeated.commandId).toBe(first.commandId);
  });

  it("ordena comandos por conversa e impede ultrapassagem", async () => {
    const repository = new InMemoryDeliveryRepository(() => new Date("2026-08-04T15:02:00Z"));
    repository.enqueue(command("2", 2));
    repository.enqueue(command("1", 1));
    const claims = await repository.claimOrdered("worker-a", 10);
    expect(claims.map(item => item.command.commandId)).toEqual(["1"]);
  });

  it("worker conclui sucesso e libera o próximo comando", async () => {
    const repository = new InMemoryDeliveryRepository(() => new Date("2026-08-04T15:02:00Z"));
    repository.enqueue(command("1", 1));
    repository.enqueue(command("2", 2));
    const provider = new QueueProvider();
    const worker = createDeliveryWorker({
      workerId: "worker-a",
      repository,
      provider,
      circuitBreaker: new InMemoryDeliveryCircuitBreaker(),
      rateLimiter: new FixedWindowDeliveryRateLimiter(10),
      now: () => new Date("2026-08-04T15:02:00Z"),
      random: () => 0.5
    });
    expect(await worker.runOnce(10)).toMatchObject({ succeeded: 1 });
    expect(await worker.runOnce(10)).toMatchObject({ succeeded: 1 });
    expect(provider.sent).toEqual(["1", "2"]);
    expect(repository.get("1")?.state).toBe("SUCCEEDED");
  });

  it("classifica retryable, aplica backoff e preserva ledger", async () => {
    let current = new Date("2026-08-04T15:02:00Z");
    const repository = new InMemoryDeliveryRepository(() => current);
    repository.enqueue(command("retry", 1));
    const provider = new QueueProvider();
    const transient = Object.assign(new Error("timeout"), {
      code: "ETIMEDOUT",
      classification: "TRANSIENT",
      retryable: true
    });
    provider.outcomes.push(transient, "SUCCESS");
    const worker = createDeliveryWorker({
      workerId: "worker-a",
      repository,
      provider,
      circuitBreaker: new InMemoryDeliveryCircuitBreaker(),
      rateLimiter: new FixedWindowDeliveryRateLimiter(10),
      now: () => current,
      random: () => 0.5
    });
    expect(await worker.runOnce()).toMatchObject({ retried: 1 });
    expect(repository.get("retry")?.attempts[0]?.outcome).toBe("RETRY");
    current = new Date("2026-08-04T15:02:02Z");
    expect(await worker.runOnce()).toMatchObject({ succeeded: 1 });
    expect(repository.get("retry")?.attempts).toHaveLength(2);
  });

  it("falha terminal vai para estado DLQ e exige justificativa para replay", async () => {
    const repository = new InMemoryDeliveryRepository(() => new Date("2026-08-04T15:02:00Z"));
    repository.enqueue(command("terminal", 1));
    const provider = new QueueProvider();
    provider.outcomes.push(Object.assign(new Error("policy"), {
      code: "POLICY_REJECTED",
      classification: "POLICY",
      retryable: false
    }));
    const worker = createDeliveryWorker({
      workerId: "worker-a",
      repository,
      provider,
      circuitBreaker: new InMemoryDeliveryCircuitBreaker(),
      rateLimiter: new FixedWindowDeliveryRateLimiter(10),
      now: () => new Date("2026-08-04T15:02:00Z")
    });
    expect(await worker.runOnce()).toMatchObject({ terminal: 1 });
    expect(repository.get("terminal")?.state).toBe("DLQ");
    await expect(repository.replay("terminal", "curta")).rejects.toThrow("REPLAY_JUSTIFICATION_REQUIRED");
    await repository.replay("terminal", "Reprocessamento sintético autorizado");
    expect(repository.get("terminal")?.state).toBe("PENDING");
  });

  it("circuit breaker abre e permite half-open após prazo", () => {
    const breaker = new InMemoryDeliveryCircuitBreaker(2, 1_000);
    const failure = {
      code: "NETWORK",
      classification: "TRANSIENT" as const,
      retryable: true,
      message: "fixture"
    };
    breaker.failure("account-1", failure, "2026-08-04T15:00:00Z");
    breaker.failure("account-1", failure, "2026-08-04T15:00:00Z");
    expect(breaker.state("account-1")).toBe("OPEN");
    expect(breaker.allow("account-1", "2026-08-04T15:00:00.500Z")).toBe(false);
    expect(breaker.allow("account-1", "2026-08-04T15:00:01.000Z")).toBe(true);
    expect(breaker.state("account-1")).toBe("HALF_OPEN");
    breaker.success("account-1");
    expect(breaker.state("account-1")).toBe("CLOSED");
  });

  it("limita volume por organização e sessão", () => {
    const limiter = new FixedWindowDeliveryRateLimiter(2, 60_000);
    expect(limiter.reserve("org-1", "account-1", "2026-08-04T15:00:00Z")).toBe(true);
    expect(limiter.reserve("org-1", "account-1", "2026-08-04T15:00:01Z")).toBe(true);
    expect(limiter.reserve("org-1", "account-1", "2026-08-04T15:00:02Z")).toBe(false);
    expect(limiter.reserve("org-2", "account-1", "2026-08-04T15:00:02Z")).toBe(true);
  });

  it("reconcilia crash depois do claim e antes da confirmação", async () => {
    let current = new Date("2026-08-04T15:02:00Z");
    const repository = new InMemoryDeliveryRepository(() => current);
    repository.enqueue(command("crash", 1));
    await repository.claimOrdered("worker-crash", 1);
    repository.simulateCrashAfterClaim("crash", "2026-08-04T15:02:01Z");
    current = new Date("2026-08-04T15:02:02Z");
    expect(await repository.reconcile(current.toISOString())).toBe(1);
    expect(repository.get("crash")?.state).toBe("FAILED");
  });

  it("backoff é limitado e classificação desconhecida é retryable", () => {
    expect(boundedDeliveryBackoffMs(99, { baseMs: 1_000, maxMs: 5_000, random: () => 1 })).toBe(5_000);
    expect(normalizeDeliveryFailure(new Error("fixture"))).toMatchObject({
      code: "UNKNOWN_PROVIDER_ERROR",
      classification: "UNKNOWN",
      retryable: true
    });
  });

  it("não envia quando rate limiter rejeita", async () => {
    const repository = new InMemoryDeliveryRepository(() => new Date("2026-08-04T15:02:00Z"));
    repository.enqueue(command("rate", 1));
    const provider = new QueueProvider();
    const reserve = vi.fn(() => false);
    const worker = createDeliveryWorker({
      workerId: "worker-a",
      repository,
      provider,
      circuitBreaker: new InMemoryDeliveryCircuitBreaker(),
      rateLimiter: { reserve },
      now: () => new Date("2026-08-04T15:02:00Z"),
      random: () => 0.5
    });
    expect(await worker.runOnce()).toMatchObject({ rateLimited: 1, succeeded: 0 });
    expect(provider.sent).toEqual([]);
  });
});
