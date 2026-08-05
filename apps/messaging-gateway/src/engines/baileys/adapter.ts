import { randomUUID } from "node:crypto";
import { createBaileysCapabilityMatrix } from "./capabilities.js";
import {
  BAILEYS_ADAPTER_SCHEMA_VERSION,
  BAILEYS_PROVIDER_TYPE,
  type BaileysConnectionUpdateLike,
  type BaileysEngineEvent,
  type BaileysEngineEventListener,
  type BaileysEngineSendCommand,
  type BaileysEngineSendResult,
  type BaileysInboundMessageLike,
  type BaileysReceiptLike,
  type BaileysSessionSnapshot,
  type BaileysSocketFactory,
  type BaileysSocketPort,
  type BaileysQuotedMessageResolver
} from "./contracts.js";
import {
  fromBaileysInboundContent,
  providerTimestamp,
  toBaileysOutboundContent
} from "./content.js";
import { BaileysAdapterError, normalizeBaileysError } from "./errors.js";
import {
  canonicalIdentityFromJid,
  jidFromCanonicalIdentity,
  sanitizedJidKind
} from "./jid.js";

export type BaileysEngineAdapterOptions = {
  organizationId: string;
  channelAccountId: string;
  providerAccountId?: string | null;
  socketFactory: BaileysSocketFactory;
  quotedMessageResolver?: BaileysQuotedMessageResolver;
  allowGroups?: boolean;
  allowNewsletters?: boolean;
  now?: () => Date;
  createEventId?: () => string;
};

function receiptType(receipt: BaileysReceiptLike["receipt"]):
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "PLAYED" {
  if (receipt.playedTimestamp) return "PLAYED";
  if (receipt.readTimestamp) return "READ";
  if (receipt.deliveredTimestamp) return "DELIVERED";
  return "SENT";
}

export class BaileysEngineAdapter {
  readonly providerType = BAILEYS_PROVIDER_TYPE;
  readonly capabilities;

  private readonly listeners = new Set<BaileysEngineEventListener>();
  private readonly now: () => Date;
  private readonly createEventId: () => string;
  private readonly allowGroups: boolean;
  private readonly allowNewsletters: boolean;
  private socket: BaileysSocketPort | null = null;
  private snapshot: BaileysSessionSnapshot;
  private bound = false;

  private readonly onConnectionUpdate = (update: BaileysConnectionUpdateLike) => {
    void this.handleConnectionUpdate(update).catch(error => this.emitEngineError(error));
  };

  private readonly onMessagesUpsert = (update: {
    messages: BaileysInboundMessageLike[];
    type: "append" | "notify";
    requestId?: string;
  }) => {
    void this.handleMessagesUpsert(update).catch(error => this.emitEngineError(error));
  };

  private readonly onReceiptUpdate = (updates: BaileysReceiptLike[]) => {
    void this.handleReceiptUpdates(updates).catch(error => this.emitEngineError(error));
  };

  constructor(private readonly options: BaileysEngineAdapterOptions) {
    if (!options.organizationId || !options.channelAccountId) {
      throw new BaileysAdapterError(
        "INVALID_COMMAND",
        "Adapter exige organização e conta de canal.",
        false
      );
    }
    this.allowGroups = options.allowGroups ?? false;
    this.allowNewsletters = options.allowNewsletters ?? false;
    this.capabilities = createBaileysCapabilityMatrix({
      allowGroups: this.allowGroups,
      allowNewsletters: this.allowNewsletters
    });
    this.now = options.now ?? (() => new Date());
    this.createEventId = options.createEventId ?? randomUUID;
    this.snapshot = this.createSnapshot("DISCONNECTED", "NOT_CONNECTED");
  }

  subscribe(listener: BaileysEngineEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async connect(channelAccountId: string): Promise<BaileysSessionSnapshot> {
    this.assertChannelAccount(channelAccountId);
    if (this.socket) return this.snapshot;

    await this.transition("CONNECTING", "SOCKET_FACTORY_START");
    try {
      const socket = await this.options.socketFactory({ channelAccountId });
      this.socket = socket;
      this.bindSocket(socket);
      return this.snapshot;
    } catch (error) {
      const normalized = normalizeBaileysError(error, "SOCKET_FACTORY_FAILED");
      await this.transition("FAILED", normalized.code);
      throw normalized;
    }
  }

  async disconnect(
    channelAccountId: string,
    reason = "REQUESTED"
  ): Promise<BaileysSessionSnapshot> {
    this.assertChannelAccount(channelAccountId);
    await this.transition("STOPPING", reason);
    const socket = this.socket;
    if (socket) {
      this.unbindSocket(socket);
      socket.end(new Error("INNOV_GATEWAY_DISCONNECT"));
    }
    this.socket = null;
    await this.transition("DISCONNECTED", reason);
    return this.snapshot;
  }

  async getSessionState(channelAccountId: string): Promise<BaileysSessionSnapshot> {
    this.assertChannelAccount(channelAccountId);
    return this.snapshot;
  }

  async send(command: BaileysEngineSendCommand): Promise<BaileysEngineSendResult> {
    this.assertCommand(command);
    const socket = this.socket;
    if (!socket || this.snapshot.state !== "READY") {
      throw new BaileysAdapterError(
        "SOCKET_NOT_CONNECTED",
        "Socket ainda não está pronto para envio.",
        true
      );
    }

    const remoteJid = jidFromCanonicalIdentity(command.to, {
      allowGroups: this.allowGroups,
      allowNewsletters: this.allowNewsletters
    });
    const content = toBaileysOutboundContent({
      messageType: command.messageType,
      content: command.content,
      remoteJid
    });

    const options: {
      quoted?: BaileysInboundMessageLike;
      messageId: string;
    } = { messageId: command.idempotencyKey };
    if (command.replyToProviderMessageId) {
      const resolver = this.options.quotedMessageResolver;
      if (!resolver) {
        throw new BaileysAdapterError(
          "QUOTED_MESSAGE_NOT_FOUND",
          "Reply exige resolver de mensagem citada.",
          false
        );
      }
      const quoted = await resolver({
        channelAccountId: command.channelAccountId,
        providerMessageId: command.replyToProviderMessageId,
        remoteJid
      });
      if (!quoted) {
        throw new BaileysAdapterError(
          "QUOTED_MESSAGE_NOT_FOUND",
          "Mensagem citada não foi localizada.",
          false
        );
      }
      options.quoted = quoted;
    }

    try {
      const accepted = await socket.sendMessage(remoteJid, content, options);
      const providerMessageId = accepted?.key.id?.trim();
      if (!providerMessageId) {
        throw new BaileysAdapterError(
          "INVALID_PROVIDER_RESPONSE",
          "Provider não retornou identificador de mensagem.",
          false
        );
      }
      const acceptedAt = providerTimestamp(
        accepted?.messageTimestamp,
        this.now().toISOString()
      );
      return {
        providerType: BAILEYS_PROVIDER_TYPE,
        providerMessageId,
        acceptedAt,
        providerMetadata: this.metadata("send.accepted", acceptedAt, {
          messageType: command.messageType,
          destinationKind: sanitizedJidKind(remoteJid),
          quoted: Boolean(options.quoted),
          groupEnabled: this.allowGroups,
          newsletterEnabled: this.allowNewsletters
        })
      };
    } catch (error) {
      throw normalizeBaileysError(error);
    }
  }

  private assertCommand(command: BaileysEngineSendCommand): void {
    if (
      !command.idempotencyKey ||
      !command.organizationId ||
      !command.conversationId ||
      !command.channelAccountId ||
      !command.to?.normalizedId
    ) {
      throw new BaileysAdapterError("INVALID_COMMAND", "Comando outbound incompleto.", false);
    }
    if (command.organizationId !== this.options.organizationId) {
      throw new BaileysAdapterError(
        "INVALID_COMMAND",
        "Comando pertence a outra organização.",
        false
      );
    }
    this.assertChannelAccount(command.channelAccountId);
    if (command.to.providerType !== BAILEYS_PROVIDER_TYPE) {
      throw new BaileysAdapterError(
        "PROVIDER_MISMATCH",
        "Destino pertence a outro provider.",
        false
      );
    }
  }

  private assertChannelAccount(channelAccountId: string): void {
    if (channelAccountId !== this.options.channelAccountId) {
      throw new BaileysAdapterError(
        "INVALID_COMMAND",
        "Conta de canal não pertence a esta instância do adapter.",
        false
      );
    }
  }

  private bindSocket(socket: BaileysSocketPort): void {
    if (this.bound) return;
    socket.ev.on("connection.update", this.onConnectionUpdate);
    socket.ev.on("messages.upsert", this.onMessagesUpsert);
    socket.ev.on("message-receipt.update", this.onReceiptUpdate);
    this.bound = true;
  }

  private unbindSocket(socket: BaileysSocketPort): void {
    if (!this.bound) return;
    socket.ev.off("connection.update", this.onConnectionUpdate);
    socket.ev.off("messages.upsert", this.onMessagesUpsert);
    socket.ev.off("message-receipt.update", this.onReceiptUpdate);
    this.bound = false;
  }

  private async handleConnectionUpdate(update: BaileysConnectionUpdateLike): Promise<void> {
    if (update.qr) {
      await this.transition("PAIRING_REQUIRED", "PAIRING_CHALLENGE_AVAILABLE", {
        pairingChallengeAvailable: true,
        qrPersisted: false
      });
      return;
    }
    switch (update.connection) {
      case "connecting":
        await this.transition("CONNECTING", "PROVIDER_CONNECTING");
        return;
      case "open":
        await this.transition("READY", "PROVIDER_OPEN", {
          newLogin: Boolean(update.isNewLogin),
          pendingNotificationsReceived: Boolean(update.receivedPendingNotifications)
        });
        return;
      case "close": {
        const normalized = normalizeBaileysError(update.lastDisconnect?.error);
        await this.transition(
          normalized.retryable ? "DEGRADED" : "ACTION_REQUIRED",
          normalized.code,
          {
            retryable: normalized.retryable,
            providerStatusCode: normalized.providerStatusCode ?? null
          }
        );
      }
    }
  }

  private async handleMessagesUpsert(update: {
    messages: BaileysInboundMessageLike[];
    type: "append" | "notify";
    requestId?: string;
  }): Promise<void> {
    for (const message of update.messages) {
      if (message.key.fromMe) continue;
      const providerMessageId = message.key.id?.trim();
      const remoteJid = message.key.remoteJid?.trim();
      if (!providerMessageId || !remoteJid) continue;
      const senderJid = message.key.participant?.trim() || remoteJid;
      const occurredAt = providerTimestamp(message.messageTimestamp, this.now().toISOString());
      const normalized = fromBaileysInboundContent({ message, providerMessageId });
      const sender = canonicalIdentityFromJid({
        jid: senderJid,
        organizationId: this.options.organizationId,
        channelAccountId: this.options.channelAccountId,
        providerAccountId: this.options.providerAccountId,
        observedAt: occurredAt,
        displayName: message.pushName || null,
        isSelf: false
      });
      await this.emit({
        kind: "MESSAGE_RECEIVED",
        eventId: this.createEventId(),
        occurredAt,
        organizationId: this.options.organizationId,
        channelAccountId: this.options.channelAccountId,
        providerType: BAILEYS_PROVIDER_TYPE,
        providerMessageId,
        sender,
        recipients: [],
        messageType: normalized.messageType,
        content: normalized.content,
        providerMetadata: this.metadata("messages.upsert", occurredAt, {
          upsertType: update.type,
          requestResponse: Boolean(update.requestId),
          remoteJidKind: sanitizedJidKind(remoteJid),
          participantJidKind: sanitizedJidKind(message.key.participant),
          fromMe: false,
          quoted: Boolean(normalized.replyToProviderMessageId)
        })
      });
    }
  }

  private async handleReceiptUpdates(updates: BaileysReceiptLike[]): Promise<void> {
    for (const update of updates) {
      const providerMessageId = update.key.id?.trim();
      if (!providerMessageId) continue;
      const occurredAt = providerTimestamp(
        update.receipt.playedTimestamp ||
          update.receipt.readTimestamp ||
          update.receipt.deliveredTimestamp ||
          update.receipt.receiptTimestamp,
        this.now().toISOString()
      );
      let identity = null;
      if (update.receipt.userJid) {
        try {
          identity = canonicalIdentityFromJid({
            jid: update.receipt.userJid,
            organizationId: this.options.organizationId,
            channelAccountId: this.options.channelAccountId,
            providerAccountId: this.options.providerAccountId,
            observedAt: occurredAt
          });
        } catch {
          identity = null;
        }
      }
      await this.emit({
        kind: "RECEIPT_RECEIVED",
        eventId: this.createEventId(),
        occurredAt,
        receipt: {
          schemaVersion: "1.0.0",
          organizationId: this.options.organizationId,
          messageId: providerMessageId,
          providerType: BAILEYS_PROVIDER_TYPE,
          channelAccountId: this.options.channelAccountId,
          providerAccountId: this.options.providerAccountId,
          providerMessageId,
          receiptType: receiptType(update.receipt),
          occurredAt,
          identity,
          providerMetadata: this.metadata("message-receipt.update", occurredAt, {
            remoteJidKind: sanitizedJidKind(update.key.remoteJid),
            participantJidKind: sanitizedJidKind(update.key.participant),
            receiptType: receiptType(update.receipt)
          })
        }
      });
    }
  }

  private createSnapshot(
    state: BaileysSessionSnapshot["state"],
    reason: string,
    attributes: Readonly<Record<string, unknown>> = {}
  ): BaileysSessionSnapshot {
    const changedAt = this.now().toISOString();
    return {
      providerType: BAILEYS_PROVIDER_TYPE,
      channelAccountId: this.options.channelAccountId,
      state,
      changedAt,
      reason,
      providerMetadata: this.metadata("connection.update", changedAt, attributes)
    };
  }

  private async transition(
    state: BaileysSessionSnapshot["state"],
    reason: string,
    attributes: Readonly<Record<string, unknown>> = {}
  ): Promise<void> {
    this.snapshot = this.createSnapshot(state, reason, attributes);
    await this.emit({
      kind: "SESSION_STATE_CHANGED",
      eventId: this.createEventId(),
      occurredAt: this.snapshot.changedAt,
      snapshot: this.snapshot
    });
  }

  private metadata(
    rawEventType: string,
    providerTimestampValue: string,
    attributes: Readonly<Record<string, unknown>>
  ): BaileysEngineSendResult["providerMetadata"] {
    return {
      providerType: BAILEYS_PROVIDER_TYPE,
      schemaVersion: BAILEYS_ADAPTER_SCHEMA_VERSION,
      rawEventType,
      providerTimestamp: providerTimestampValue,
      attributes
    };
  }

  private async emit(event: BaileysEngineEvent): Promise<void> {
    await Promise.all([...this.listeners].map(listener => listener(event)));
  }

  private async emitEngineError(error: unknown): Promise<void> {
    const normalized = normalizeBaileysError(error);
    await this.emit({
      kind: "ENGINE_ERROR",
      eventId: this.createEventId(),
      occurredAt: this.now().toISOString(),
      providerType: BAILEYS_PROVIDER_TYPE,
      channelAccountId: this.options.channelAccountId,
      code: normalized.code,
      retryable: normalized.retryable,
      message: normalized.message,
      providerMetadata: this.metadata("adapter.error", this.now().toISOString(), {
        providerStatusCode: normalized.providerStatusCode ?? null
      })
    });
  }
}
