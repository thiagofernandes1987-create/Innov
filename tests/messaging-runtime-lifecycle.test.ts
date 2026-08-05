import { describe, expect, it } from "vitest";
import {
  RuntimeLifecycleError,
  SessionLifecycleSupervisor,
  classifyRuntimeFailure,
  createMemoryRuntimeLeaseRepository,
  reconnectBackoffMs,
  type RuntimeConnectionContext,
  type RuntimeProviderSignal,
  type SessionRuntimeDriver,
  type SessionRuntimeScope
} from "../apps/messaging-gateway/src/runtime/index.js";

const scope: SessionRuntimeScope = {
  organizationId: "11111111-1111-1111-1111-111111111111",
  sessionId: "72000000-0000-0000-0000-000000000001",
  channelAccountId: "10000000-0000-0000-0000-000000000001",
  providerType: "WHATSAPP_WEB_BAILEYS"
};

class FakeRuntimeDriver implements SessionRuntimeDriver {
  context: RuntimeConnectionContext | null = null;
  connectCount = 0;
  readonly disconnectReasons: string[] = [];

  async connect(context: RuntimeConnectionContext): Promise<void> {
    this.context = context;
    this.connectCount += 1;
  }

  async disconnect(reason: string): Promise<void> {
    this.disconnectReasons.push(reason);
  }

  async emit(signal: RuntimeProviderSignal): Promise<void> {
    if (!this.context) throw new Error("Driver ainda não recebeu contexto.");
    await this.context.onSignal(signal);
  }
}

function clock(start = "2026-08-04T13:00:00.000Z") {
  let value = Date.parse(start);
  return {
    now: () => new Date(value),
    advance: (milliseconds: number) => {
      value += milliseconds;
    }
  };
}

function supervisor(input: {
  instanceId: string;
  driver: FakeRuntimeDriver;
  repository: ReturnType<typeof createMemoryRuntimeLeaseRepository>;
  now: () => Date;
  onPairingNotice?: (notice: {
    challengeId: string;
    kind: "QR" | "PAIRING_CODE";
    available: true;
    expiresAt: string;
    persisted: false;
  }) => void;
}) {
  return new SessionLifecycleSupervisor({
    scope,
    holderInstanceId: input.instanceId,
    leaseTtlMs: 5_000,
    leaseRepository: input.repository,
    driver: input.driver,
    now: input.now,
    random: () => 0.5,
    createId: () => "challenge-safe-id",
    onPairingNotice: input.onPairingNotice
  });
}

describe("W-08 runtime lease and lifecycle", () => {
  it("impede dois writers e incrementa o fencing token após expiração", async () => {
    const time = clock();
    const repository = createMemoryRuntimeLeaseRepository({ now: time.now });
    const first = await repository.acquire({ ...scope, holderInstanceId: "instance-a", ttlMs: 5_000 });
    expect(first.fencingToken).toBe(1);

    await expect(
      repository.acquire({ ...scope, holderInstanceId: "instance-b", ttlMs: 5_000 })
    ).rejects.toMatchObject({ code: "LEASE_HELD" });

    time.advance(5_001);
    const takeover = await repository.acquire({
      ...scope,
      holderInstanceId: "instance-b",
      ttlMs: 5_000
    });
    expect(takeover.fencingToken).toBe(2);
    await expect(
      repository.assertFence({ ...scope, holderInstanceId: "instance-a", fencingToken: 1 })
    ).rejects.toMatchObject({ code: "FENCING_TOKEN_STALE" });
  });

  it("renova o lease do mesmo holder sem trocar o token", async () => {
    const time = clock();
    const repository = createMemoryRuntimeLeaseRepository({ now: time.now });
    const acquired = await repository.acquire({
      ...scope,
      holderInstanceId: "instance-a",
      ttlMs: 5_000
    });
    time.advance(1_000);
    const renewed = await repository.renew({
      ...scope,
      holderInstanceId: "instance-a",
      fencingToken: acquired.fencingToken,
      ttlMs: 10_000
    });
    expect(renewed.fencingToken).toBe(1);
    expect(Date.parse(renewed.leaseExpiresAt)).toBe(time.now().getTime() + 10_000);
  });

  it("descarta o valor do QR e publica somente metadados efêmeros", async () => {
    const time = clock();
    const repository = createMemoryRuntimeLeaseRepository({ now: time.now });
    const driver = new FakeRuntimeDriver();
    const notices: unknown[] = [];
    const runtime = supervisor({
      instanceId: "instance-a",
      driver,
      repository,
      now: time.now,
      onPairingNotice: notice => notices.push(notice)
    });

    await runtime.start();
    await driver.emit({
      kind: "PAIRING_CHALLENGE",
      challengeKind: "QR",
      challengeValue: "secret-qr-value-never-persisted",
      expiresAt: new Date(time.now().getTime() + 30_000).toISOString()
    });

    const snapshot = runtime.getSnapshot();
    expect(snapshot.state).toBe("PAIRING_REQUIRED");
    expect(snapshot.pairing).toEqual({
      challengeId: "challenge-safe-id",
      kind: "QR",
      available: true,
      expiresAt: new Date(time.now().getTime() + 30_000).toISOString(),
      persisted: false
    });
    expect(JSON.stringify({ snapshot, notices })).not.toContain("secret-qr-value-never-persisted");

    await driver.emit({ kind: "CONNECTED" });
    expect(runtime.getSnapshot().state).toBe("READY");
    expect(runtime.getSnapshot().pairing).toBeNull();
  });

  it("reconecta falha transitória somente após backoff com jitter limitado", async () => {
    const time = clock();
    const repository = createMemoryRuntimeLeaseRepository({ now: time.now });
    const driver = new FakeRuntimeDriver();
    const runtime = supervisor({ instanceId: "instance-a", driver, repository, now: time.now });

    await runtime.start();
    await driver.emit({ kind: "CONNECTED" });
    await driver.emit({ kind: "DISCONNECTED", error: { code: "ETIMEDOUT" } });
    expect(runtime.getSnapshot()).toMatchObject({ state: "BACKOFF", reconnectAttempt: 1 });

    await expect(runtime.reconnectNow()).rejects.toMatchObject({
      code: "INVALID_STATE_TRANSITION"
    });
    time.advance(1_000);
    await runtime.reconnectNow();
    expect(driver.connectCount).toBe(2);
    expect(runtime.getSnapshot().state).toBe("CONNECTING");
  });

  it.each([
    [{ code: "LOGGED_OUT" }, "LOGGED_OUT"],
    [{ code: "ACCOUNT_RESTRICTED" }, "RESTRICTED"],
    [{ code: "BAD_SESSION" }, "ACTION_REQUIRED"]
  ] as const)("classifica encerramento %j como %s", async (failure, expectedState) => {
    const time = clock();
    const repository = createMemoryRuntimeLeaseRepository({ now: time.now });
    const driver = new FakeRuntimeDriver();
    const runtime = supervisor({ instanceId: "instance-a", driver, repository, now: time.now });
    await runtime.start();
    await driver.emit({ kind: "CONNECTED" });
    await driver.emit({ kind: "DISCONNECTED", error: failure });
    expect(runtime.getSnapshot().state).toBe(expectedState);
    expect(runtime.getSnapshot().fencingToken).toBeNull();
  });

  it("bloqueia início pelo kill switch de sessão", async () => {
    const time = clock();
    const repository = createMemoryRuntimeLeaseRepository({ now: time.now });
    await repository.setSessionKillSwitch({ ...scope, enabled: true, reason: "MANUAL_STOP" });
    const runtime = supervisor({
      instanceId: "instance-a",
      driver: new FakeRuntimeDriver(),
      repository,
      now: time.now
    });
    await expect(runtime.start()).rejects.toMatchObject({ code: "KILL_SWITCH_ACTIVE" });
    expect(runtime.getSnapshot().state).toBe("KILLED");
  });

  it("encerra writer ativo quando o kill switch global é acionado", async () => {
    const time = clock();
    const repository = createMemoryRuntimeLeaseRepository({ now: time.now });
    const driver = new FakeRuntimeDriver();
    const runtime = supervisor({ instanceId: "instance-a", driver, repository, now: time.now });
    await runtime.start();
    await driver.emit({ kind: "CONNECTED" });
    await repository.setGlobalKillSwitch({ enabled: true, reason: "INCIDENT_RESPONSE" });
    await runtime.enforceKillSwitch();
    expect(runtime.getSnapshot().state).toBe("KILLED");
    expect(driver.disconnectReasons).toContain("KILL_SWITCH_ACTIVE");
  });

  it("fenceia processo zumbi após takeover", async () => {
    const time = clock();
    const repository = createMemoryRuntimeLeaseRepository({ now: time.now });
    const driverA = new FakeRuntimeDriver();
    const runtimeA = supervisor({ instanceId: "instance-a", driver: driverA, repository, now: time.now });
    await runtimeA.start();

    time.advance(5_001);
    const runtimeB = supervisor({
      instanceId: "instance-b",
      driver: new FakeRuntimeDriver(),
      repository,
      now: time.now
    });
    await runtimeB.start();

    await expect(
      runtimeA.runFencedCredentialMutation(async () => "must-not-run")
    ).rejects.toMatchObject({ code: "FENCING_TOKEN_STALE" });
    expect(runtimeA.getSnapshot().state).toBe("FENCED_OUT");
    await expect(runtimeB.runFencedCredentialMutation(async ({ fencingToken }) => fencingToken))
      .resolves.toBe(2);
  });

  it("aborta atualização de credenciais se ocorrer takeover antes do commit", async () => {
    const time = clock();
    const repository = createMemoryRuntimeLeaseRepository({ now: time.now });
    const runtimeA = supervisor({
      instanceId: "instance-a",
      driver: new FakeRuntimeDriver(),
      repository,
      now: time.now
    });
    await runtimeA.start();
    let committed = false;

    await expect(runtimeA.runFencedCredentialMutation(async lease => {
      await repository.assertFence({ ...scope, ...lease });
      time.advance(5_001);
      const runtimeB = supervisor({
        instanceId: "instance-b",
        driver: new FakeRuntimeDriver(),
        repository,
        now: time.now
      });
      await runtimeB.start();
      await repository.assertFence({ ...scope, ...lease });
      committed = true;
      return "committed";
    })).rejects.toMatchObject({ code: "FENCING_TOKEN_STALE" });

    expect(committed).toBe(false);
  });

  it("restaura checkpoint somente pela nova instância com token vigente", async () => {
    const time = clock();
    const repository = createMemoryRuntimeLeaseRepository({ now: time.now });
    const runtimeA = supervisor({
      instanceId: "instance-a",
      driver: new FakeRuntimeDriver(),
      repository,
      now: time.now
    });
    await runtimeA.start();
    time.advance(5_001);
    const runtimeB = supervisor({
      instanceId: "instance-b",
      driver: new FakeRuntimeDriver(),
      repository,
      now: time.now
    });
    await runtimeB.start();

    const restored = await runtimeB.restoreOnNewInstance(async lease => {
      await repository.assertFence({ ...scope, ...lease });
      return { manifestSha256: "a".repeat(64), fencingToken: lease.fencingToken };
    });
    expect(restored).toEqual({ manifestSha256: "a".repeat(64), fencingToken: 2 });
    await expect(runtimeA.restoreOnNewInstance(async () => true)).rejects.toBeInstanceOf(
      RuntimeLifecycleError
    );
  });

  it("release preserva contador monotônico para a próxima instância", async () => {
    const time = clock();
    const repository = createMemoryRuntimeLeaseRepository({ now: time.now });
    const driver = new FakeRuntimeDriver();
    const runtimeA = supervisor({ instanceId: "instance-a", driver, repository, now: time.now });
    await runtimeA.start();
    await runtimeA.stop();
    const next = await repository.acquire({
      ...scope,
      holderInstanceId: "instance-b",
      ttlMs: 5_000
    });
    expect(next.fencingToken).toBe(2);
  });

  it("rejeita desafio de pairing vazio ou expirado", async () => {
    const time = clock();
    const repository = createMemoryRuntimeLeaseRepository({ now: time.now });
    const driver = new FakeRuntimeDriver();
    const runtime = supervisor({ instanceId: "instance-a", driver, repository, now: time.now });
    await runtime.start();
    await expect(driver.emit({
      kind: "PAIRING_CHALLENGE",
      challengeKind: "PAIRING_CODE",
      challengeValue: "",
      expiresAt: new Date(time.now().getTime() - 1).toISOString()
    })).rejects.toMatchObject({ code: "PAIRING_CHALLENGE_INVALID" });
  });

  it("mantém classificação e backoff dentro de limites determinísticos", () => {
    expect(classifyRuntimeFailure({ statusCode: 503 })).toEqual({
      category: "TRANSIENT",
      retryable: true,
      reasonCode: "HTTP_503"
    });
    expect(classifyRuntimeFailure({ statusCode: 401 }).category).toBe("LOGGED_OUT");
    expect(classifyRuntimeFailure({ statusCode: 403 }).category).toBe("RESTRICTED");
    expect(reconnectBackoffMs({ attempt: 20, maxMs: 60_000, random: () => 1 })).toBe(60_000);
  });
});
