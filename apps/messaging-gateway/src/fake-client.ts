import { createHash, randomUUID } from "node:crypto";
import type { GatewayCommandEnvelope, GatewayCommandResult, GatewayEventEnvelope } from "./contracts.js";

export class FakeChannelClient {
  private active = false;
  private readonly events: GatewayEventEnvelope[] = [];

  start(): void { this.active = true; }
  stop(): void { this.active = false; }
  isReady(): boolean { return this.active; }
  recordedEvents(): readonly GatewayEventEnvelope[] { return [...this.events]; }

  async execute(command: GatewayCommandEnvelope): Promise<GatewayCommandResult> {
    if (!this.active) throw new Error("FAKE_CLIENT_NOT_READY");

    const eventType = command.action === "PING"
      ? "FAKE_COMMAND_ACCEPTED"
      : "FAKE_MESSAGE_ACCEPTED";
    const payloadDigest = createHash("sha256")
      .update(JSON.stringify(command.payload))
      .digest("hex");
    const event: GatewayEventEnvelope = {
      schemaVersion: "1.0.0",
      eventId: randomUUID(),
      eventType,
      organizationId: command.organizationId,
      commandId: command.commandId,
      correlationId: command.correlationId,
      causationId: command.causationId || command.commandId,
      occurredAt: new Date().toISOString(),
      payload: {
        fake: true,
        action: command.action,
        payloadSha256: payloadDigest
      }
    };
    this.events.push(event);
    return { accepted: true, event };
  }
}
