import { randomUUID } from "node:crypto";
import type {
  CanonicalDeliveryCommand,
  ClaimedDelivery,
  DeliveryAttempt,
  DeliveryRepository,
  ProviderDeliveryFailure,
  ProviderDeliveryResult
} from "./contracts.js";

export type InMemoryCommandState = "PENDING" | "CLAIMED" | "SUCCEEDED" | "FAILED" | "DLQ";

type StoredCommand = {
  command: CanonicalDeliveryCommand;
  state: InMemoryCommandState;
  attemptCount: number;
  availableAt: string;
  claim?: ClaimedDelivery | null;
  attempts: DeliveryAttempt[];
  providerMessageId?: string | null;
  confirmationDeadline?: string | null;
};

export class InMemoryDeliveryRepository implements DeliveryRepository {
  private readonly commands = new Map<string, StoredCommand>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  enqueue(command: CanonicalDeliveryCommand): CanonicalDeliveryCommand {
    const existing = [...this.commands.values()].find(item =>
      item.command.organizationId === command.organizationId &&
      item.command.providerType === command.providerType &&
      item.command.providerAccountId === command.providerAccountId &&
      item.command.idempotencyKey === command.idempotencyKey
    );
    if (existing) return existing.command;
    this.commands.set(command.commandId, {
      command,
      state: "PENDING",
      attemptCount: 0,
      availableAt: command.createdAt,
      attempts: []
    });
    return command;
  }

  async claimOrdered(workerId: string, limit: number): Promise<readonly ClaimedDelivery[]> {
    const timestamp = this.now().toISOString();
    const candidates = [...this.commands.values()]
      .filter(item =>
        (item.state === "PENDING" || item.state === "FAILED") &&
        Date.parse(item.availableAt) <= Date.parse(timestamp)
      )
      .sort((left, right) =>
        left.command.conversationId.localeCompare(right.command.conversationId) ||
        left.command.sequenceNumber - right.command.sequenceNumber ||
        left.command.createdAt.localeCompare(right.command.createdAt)
      );
    const claims: ClaimedDelivery[] = [];
    for (const item of candidates) {
      const earlierIncomplete = [...this.commands.values()].some(other =>
        other.command.conversationId === item.command.conversationId &&
        other.command.sequenceNumber < item.command.sequenceNumber &&
        other.state !== "SUCCEEDED" &&
        other.state !== "DLQ"
      );
      if (earlierIncomplete) continue;
      item.attemptCount += 1;
      item.state = "CLAIMED";
      item.claim = {
        command: item.command,
        workerId,
        claimToken: randomUUID(),
        attemptNumber: item.attemptCount,
        claimedAt: timestamp
      };
      claims.push(item.claim);
      if (claims.length >= Math.max(1, limit)) break;
    }
    return claims;
  }

  async complete(claim: ClaimedDelivery, result: ProviderDeliveryResult): Promise<DeliveryAttempt> {
    const item = this.requireClaim(claim);
    const attempt: DeliveryAttempt = {
      commandId: claim.command.commandId,
      attemptNumber: claim.attemptNumber,
      outcome: "SUCCESS",
      startedAt: claim.claimedAt,
      finishedAt: result.acceptedAt,
      providerMessageId: result.providerMessageId
    };
    item.state = "SUCCEEDED";
    item.providerMessageId = result.providerMessageId;
    item.confirmationDeadline = null;
    item.claim = null;
    item.attempts.push(attempt);
    return attempt;
  }

  async fail(
    claim: ClaimedDelivery,
    failure: ProviderDeliveryFailure,
    nextAttemptAt: string | null
  ): Promise<DeliveryAttempt> {
    const item = this.requireClaim(claim);
    const retry = failure.retryable && nextAttemptAt !== null;
    const attempt: DeliveryAttempt = {
      commandId: claim.command.commandId,
      attemptNumber: claim.attemptNumber,
      outcome: retry ? "RETRY" : "TERMINAL",
      startedAt: claim.claimedAt,
      finishedAt: this.now().toISOString(),
      nextAttemptAt,
      failure
    };
    item.state = retry ? "FAILED" : "DLQ";
    item.availableAt = nextAttemptAt ?? item.availableAt;
    item.claim = null;
    item.attempts.push(attempt);
    return attempt;
  }

  async reconcile(now: string): Promise<number> {
    let reconciled = 0;
    for (const item of this.commands.values()) {
      if (
        item.state === "CLAIMED" &&
        item.confirmationDeadline &&
        Date.parse(item.confirmationDeadline) <= Date.parse(now)
      ) {
        item.state = "FAILED";
        item.availableAt = now;
        item.claim = null;
        reconciled += 1;
      }
    }
    return reconciled;
  }

  async replay(commandId: string, justification: string): Promise<void> {
    if (justification.trim().length < 8) throw new Error("REPLAY_JUSTIFICATION_REQUIRED");
    const item = this.commands.get(commandId);
    if (!item || (item.state !== "DLQ" && item.state !== "FAILED")) {
      throw new Error("COMMAND_NOT_REPLAYABLE");
    }
    item.state = "PENDING";
    item.availableAt = this.now().toISOString();
    item.claim = null;
  }

  simulateCrashAfterClaim(commandId: string, confirmationDeadline: string): void {
    const item = this.commands.get(commandId);
    if (!item || item.state !== "CLAIMED") throw new Error("COMMAND_NOT_CLAIMED");
    item.confirmationDeadline = confirmationDeadline;
  }

  get(commandId: string) {
    return this.commands.get(commandId) ?? null;
  }

  private requireClaim(claim: ClaimedDelivery): StoredCommand {
    const item = this.commands.get(claim.command.commandId);
    if (
      !item ||
      item.state !== "CLAIMED" ||
      item.claim?.claimToken !== claim.claimToken ||
      item.claim.workerId !== claim.workerId
    ) {
      throw new Error("CLAIM_MISMATCH");
    }
    return item;
  }
}
