import type {
  CanonicalIngressEnvelope,
  IngressFailure,
  IngressRepository,
  PersistedIngressEvent
} from "./contracts.js";

export class InMemoryIngressRepository implements IngressRepository {
  private readonly events = new Map<string, PersistedIngressEvent>();
  private readonly deadLetters = new Map<string, { envelope: CanonicalIngressEnvelope; failure: IngressFailure }>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async persist(envelope: CanonicalIngressEnvelope): Promise<PersistedIngressEvent> {
    const existing = this.events.get(envelope.idempotencyKey);
    if (existing) return { ...existing, duplicate: true };
    const persisted: PersistedIngressEvent = {
      envelope,
      state: "PERSISTED",
      persistedAt: this.now().toISOString(),
      replayCount: 0,
      duplicate: false
    };
    this.events.set(envelope.idempotencyKey, persisted);
    return persisted;
  }

  async get(idempotencyKey: string): Promise<PersistedIngressEvent | null> {
    return this.events.get(idempotencyKey) ?? null;
  }

  async markDispatched(idempotencyKey: string): Promise<PersistedIngressEvent> {
    const existing = this.events.get(idempotencyKey);
    if (!existing) throw new Error("INGRESS_NOT_FOUND");
    if (existing.state !== "PERSISTED" && existing.state !== "DISPATCHED") {
      throw new Error("INGRESS_NOT_PERSISTED");
    }
    const updated = { ...existing, state: "DISPATCHED" as const };
    this.events.set(idempotencyKey, updated);
    return updated;
  }

  async moveToDlq(envelope: CanonicalIngressEnvelope, failure: IngressFailure): Promise<void> {
    this.deadLetters.set(envelope.idempotencyKey, { envelope, failure });
    const existing = this.events.get(envelope.idempotencyKey);
    if (existing) this.events.set(envelope.idempotencyKey, { ...existing, state: "DLQ" });
  }

  async replay(idempotencyKey: string): Promise<PersistedIngressEvent> {
    const existing = this.events.get(idempotencyKey);
    if (!existing) throw new Error("INGRESS_NOT_FOUND");
    const updated = {
      ...existing,
      state: "PERSISTED" as const,
      replayCount: existing.replayCount + 1,
      duplicate: true
    };
    this.events.set(idempotencyKey, updated);
    this.deadLetters.delete(idempotencyKey);
    return updated;
  }

  getDeadLetter(idempotencyKey: string) {
    return this.deadLetters.get(idempotencyKey) ?? null;
  }
}
