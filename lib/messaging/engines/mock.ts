import {
  ENGINE_CAPABILITIES,
  requireEngineCapability,
  type EngineCapability,
  type EngineCapabilityMatrix,
  type EngineCapabilityState
} from "@/lib/messaging/capabilities";
import type { ChannelProviderType } from "@/lib/messaging/domain";
import {
  InMemoryEngineEventSource,
  MessagingEngineError,
  assertEngineCommand,
  type EngineEvent,
  type EngineEventListener,
  type EnginePairingChallenge,
  type EngineSendCommand,
  type EngineSendResult,
  type EngineSessionSnapshot,
  type MessagingEngine,
  type SessionEngine,
  type EngineEventSource
} from "@/lib/messaging/engine";

function mockCapabilityMatrix(
  providerType: ChannelProviderType,
  supportedCapabilities: readonly EngineCapability[]
): EngineCapabilityMatrix {
  const supported = new Set(supportedCapabilities);
  return {
    providerType,
    version: "mock-v1",
    capabilities: Object.fromEntries(
      ENGINE_CAPABILITIES.map(capability => [
        capability,
        supported.has(capability)
          ? { support: "SUPPORTED" as const }
          : {
              support: "UNSUPPORTED" as const,
              reason: "Capacidade não habilitada neste mock."
            }
      ])
    ) as Record<EngineCapability, EngineCapabilityState>
  };
}

export class MockMessagingEngine
  implements MessagingEngine, SessionEngine, EngineEventSource
{
  readonly capabilities: EngineCapabilityMatrix;
  readonly sentCommands: EngineSendCommand[] = [];
  private readonly sessionStates = new Map<string, EngineSessionSnapshot>();
  private readonly failures: MessagingEngineError[] = [];
  private readonly eventSource: InMemoryEngineEventSource;
  private sequence = 0;

  constructor(
    public readonly providerType: ChannelProviderType = "CUSTOM",
    supportedCapabilities: readonly EngineCapability[] = [
      "CONVERSATION_START",
      "MESSAGE_SEND_TEXT",
      "MESSAGE_SEND_DOCUMENT",
      "MESSAGE_SEND_REPLY",
      "INBOUND_MESSAGES",
      "INBOUND_RECEIPTS",
      "SESSION_PAIRING",
      "SESSION_RECONNECT"
    ]
  ) {
    this.capabilities = mockCapabilityMatrix(providerType, supportedCapabilities);
    this.eventSource = new InMemoryEngineEventSource(providerType);
  }

  queueFailure(error: MessagingEngineError) {
    this.failures.push(error);
  }

  async send(command: EngineSendCommand): Promise<EngineSendResult> {
    assertEngineCommand(this, command);
    const failure = this.failures.shift();
    if (failure) throw failure;
    this.sentCommands.push(structuredClone(command));
    this.sequence += 1;
    return {
      providerType: this.providerType,
      providerMessageId: `mock-${this.sequence}`,
      acceptedAt: new Date(0).toISOString(),
      providerMetadata: {
        providerType: this.providerType,
        schemaVersion: "mock-v1",
        attributes: {
          sequence: this.sequence,
          idempotencyKey: command.idempotencyKey
        }
      }
    };
  }

  async connect(channelAccountId: string): Promise<EngineSessionSnapshot> {
    requireEngineCapability(this.capabilities, "SESSION_RECONNECT");
    const snapshot = this.snapshot(channelAccountId, "READY");
    this.sessionStates.set(channelAccountId, snapshot);
    await this.emit({
      kind: "SESSION_STATE_CHANGED",
      eventId: `mock-session-${++this.sequence}`,
      occurredAt: snapshot.changedAt,
      snapshot
    });
    return snapshot;
  }

  async disconnect(
    channelAccountId: string,
    reason = "mock_disconnect"
  ): Promise<EngineSessionSnapshot> {
    const snapshot = this.snapshot(channelAccountId, "DISCONNECTED", reason);
    this.sessionStates.set(channelAccountId, snapshot);
    await this.emit({
      kind: "SESSION_STATE_CHANGED",
      eventId: `mock-session-${++this.sequence}`,
      occurredAt: snapshot.changedAt,
      snapshot
    });
    return snapshot;
  }

  async getSessionState(channelAccountId: string): Promise<EngineSessionSnapshot> {
    return (
      this.sessionStates.get(channelAccountId) ??
      this.snapshot(channelAccountId, "DISCONNECTED")
    );
  }

  async requestPairing(channelAccountId: string): Promise<EnginePairingChallenge> {
    requireEngineCapability(this.capabilities, "SESSION_PAIRING");
    return {
      type: "PAIRING_CODE",
      value: `MOCK-${channelAccountId.slice(0, 6).toUpperCase()}`,
      expiresAt: new Date(60_000).toISOString()
    };
  }

  subscribe(listener: EngineEventListener) {
    return this.eventSource.subscribe(listener);
  }

  emit(event: EngineEvent) {
    return this.eventSource.emit(event);
  }

  private snapshot(
    channelAccountId: string,
    state: EngineSessionSnapshot["state"],
    reason?: string
  ): EngineSessionSnapshot {
    return {
      providerType: this.providerType,
      channelAccountId,
      state,
      changedAt: new Date(0).toISOString(),
      reason
    };
  }
}
