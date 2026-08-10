import { describe, expect, it } from "vitest";
import {
  SYNTHETIC_CHAOS_SCENARIOS,
  createSyntheticRuntimeState,
  runSyntheticBenchmark,
  runSyntheticChaosScenario
} from "@/lib/messaging/verification";

describe("W-19 chaos sintético", () => {
  for (const scenario of SYNTHETIC_CHAOS_SCENARIOS) {
    it(`aprova cenário ${scenario}`, () => {
      const result = runSyntheticChaosScenario(scenario);
      expect(result.status).toBe("PASSED");
      expect(result.dataLoss).toBe(false);
      expect(result.duplicateSideEffect).toBe(false);
      expect(result.splitBrain).toBe(false);
      expect(result.recovered).toBe(true);
      expect(result.assertions.length).toBeGreaterThanOrEqual(2);
    });
  }

  it("reinício durante mensagem preserva persistência e evita duplicidade", () => {
    const result = runSyntheticChaosScenario("RESTART_DURING_MESSAGE");
    expect(result.assertions).toContain("persist-before-restart");
    expect(result.assertions).toContain("single-dispatch");
  });

  it("reinício durante key update preserva versão monotônica", () => {
    const state = createSyntheticRuntimeState();
    const result = runSyntheticChaosScenario("RESTART_DURING_KEY_UPDATE", state);
    expect(result.assertions).toContain("credential-version-monotonic");
  });

  it("perda de rede mantém comando até recuperação", () => {
    const result = runSyntheticChaosScenario("NETWORK_LOSS");
    expect(result.assertions).toContain("command-retained");
  });

  it("evento duplicado produz efeito único", () => {
    expect(runSyntheticChaosScenario("DUPLICATE_EVENT").duplicateSideEffect).toBe(false);
  });

  it("receipt fora de ordem não causa regressão", () => {
    expect(runSyntheticChaosScenario("OUT_OF_ORDER_RECEIPT").assertions).toContain("no-status-regression");
  });

  it("mídia corrompida permanece bloqueada", () => {
    expect(runSyntheticChaosScenario("CORRUPTED_MEDIA").assertions).toContain("no-clean-promotion");
  });

  it("banco indisponível falha fechado", () => {
    expect(runSyntheticChaosScenario("DATABASE_UNAVAILABLE").assertions).toContain("fail-closed");
  });

  it("processo zumbi é rejeitado por fencing", () => {
    expect(runSyntheticChaosScenario("ZOMBIE_PROCESS").assertions).toContain("stale-writer-rejected");
  });

  it("réplicas disputando sessão preservam single writer", () => {
    expect(runSyntheticChaosScenario("SESSION_REPLICA_CONTENTION").assertions).toContain("one-lease-holder");
  });

  it("upgrade e downgrade preservam contrato canônico", () => {
    expect(runSyntheticChaosScenario("UPGRADE_DOWNGRADE").assertions).toContain("canonical-contract-stable");
  });

  it("restore em infraestrutura nova avança fencing", () => {
    expect(runSyntheticChaosScenario("RESTORE_NEW_INFRASTRUCTURE").assertions).toContain("fencing-advanced");
  });
});

describe("W-19 benchmark sintético", () => {
  it("mede memória por sessão, throughput e latência", () => {
    const benchmark = runSyntheticBenchmark(5_000, 100);
    expect(benchmark.environment).toBe("SYNTHETIC_LOCAL");
    expect(benchmark.iterations).toBe(5_000);
    expect(benchmark.throughputPerSecond).toBeGreaterThan(0);
    expect(benchmark.p50LatencyMs).toBeGreaterThanOrEqual(0);
    expect(benchmark.p95LatencyMs).toBeGreaterThanOrEqual(benchmark.p50LatencyMs);
    expect(benchmark.bytesPerSyntheticSession).toBeGreaterThanOrEqual(0);
    expect(benchmark.passed).toBe(true);
  });

  it("registra limites medidos sem afirmar capacidade produtiva", () => {
    const benchmark = runSyntheticBenchmark(2_000, 50);
    expect(benchmark.limits).toEqual({
      minimumThroughputPerSecond: 1_000,
      maximumP95LatencyMs: 5,
      maximumBytesPerSyntheticSession: 1_000_000
    });
    expect(JSON.stringify(benchmark)).toContain("SYNTHETIC_LOCAL");
  });
});
