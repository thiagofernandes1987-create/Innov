import { describe, expect, it } from "vitest";
import type { MessagingUiCapabilities } from "../lib/messaging/capabilities";
import {
  buildUnifiedInbox,
  channelStateLabel,
  deriveInboxActionAvailability,
  filterUnifiedInbox,
  messagingProviderLabel,
  resolveEffectiveOperatorPresence,
  type InboxThread
} from "../lib/messaging/inbox";

function capabilities(
  providerType: MessagingUiCapabilities["providerType"],
  enabled = true
): MessagingUiCapabilities {
  return {
    providerType,
    enabled,
    canStartConversation: enabled,
    canSendText: enabled,
    canSendTemplate: providerType === "META_CLOUD" && enabled,
    canSendDocument: enabled,
    canSendImage: providerType === "WHATSAPP_WEB_BAILEYS" && enabled,
    canSendAudio: false,
    canSendVideo: false,
    canSendReaction: providerType === "WHATSAPP_WEB_BAILEYS" && enabled,
    canReply: providerType === "WHATSAPP_WEB_BAILEYS" && enabled,
    canUseGroups: false,
    canUsePresence: false,
    canSyncHistory: false,
    canEditMessages: false,
    canSendAny: enabled
  };
}

function thread(overrides: Partial<InboxThread> = {}): InboxThread {
  return {
    conversationId: "conversation-meta",
    contactId: "contact-1",
    contactName: "Cliente Integrado",
    accountId: "account-meta",
    providerType: "META_CLOUD",
    providerAccountId: "phone-1",
    providerLabel: "Meta Cloud",
    channelState: "ONLINE",
    queueId: "queue-general",
    queueName: "Atendimento geral",
    assignedTo: "agent-1",
    assignedName: "Agente Um",
    projectId: "project-1",
    projectName: "Obra Alpha",
    status: "OPEN",
    unreadCount: 1,
    lastMessageAt: "2026-08-04T18:00:00.000Z",
    lastActorKind: "HUMAN",
    capabilities: capabilities("META_CLOUD"),
    ...overrides
  };
}

describe("Messaging inbox W-13", () => {
  it("unifica threads do mesmo contato sem perder provider e origem", () => {
    const unified = buildUnifiedInbox([
      thread(),
      thread({
        conversationId: "conversation-web",
        accountId: "account-web",
        providerType: "WHATSAPP_WEB_BAILEYS",
        providerAccountId: "web-session-1",
        providerLabel: "WhatsApp Web",
        channelState: "DEGRADED",
        unreadCount: 2,
        lastMessageAt: "2026-08-04T18:05:00.000Z",
        capabilities: capabilities("WHATSAPP_WEB_BAILEYS")
      })
    ]);
    expect(unified).toHaveLength(1);
    expect(unified[0]?.threads).toHaveLength(2);
    expect(unified[0]?.providerTypes).toEqual([
      "WHATSAPP_WEB_BAILEYS",
      "META_CLOUD"
    ]);
    expect(unified[0]?.unreadCount).toBe(3);
    expect(unified[0]?.threads[0]?.conversationId).toBe("conversation-web");
    expect(unified[0]?.threads[0]?.providerAccountId).toBe("web-session-1");
  });

  it("detecta ownership conflitante entre threads unificadas", () => {
    const result = buildUnifiedInbox([
      thread(),
      thread({
        conversationId: "conversation-2",
        assignedTo: "agent-2",
        queueId: "queue-engineering"
      })
    ]);
    expect(result[0]?.conflictingOwnership).toBe(true);
    expect(result[0]?.assignedTo).toBeNull();
    expect(result[0]?.queueId).toBeNull();
  });

  it("filtra por provider, fila, responsável, obra, estado, unread e busca", () => {
    const unified = buildUnifiedInbox([
      thread(),
      thread({
        conversationId: "conversation-web",
        providerType: "WHATSAPP_WEB_BAILEYS",
        providerAccountId: "web-1",
        accountId: "account-web",
        channelState: "RECONNECTING",
        queueId: "queue-engineering",
        queueName: "Engenharia",
        assignedTo: "agent-2",
        assignedName: "Agente Dois",
        projectId: "project-2",
        projectName: "Obra Beta",
        unreadCount: 0,
        capabilities: capabilities("WHATSAPP_WEB_BAILEYS")
      }),
      thread({
        conversationId: "conversation-other",
        contactId: "contact-2",
        contactName: "Outro Cliente",
        unreadCount: 0
      })
    ]);
    expect(filterUnifiedInbox(unified, {
      providerType: "WHATSAPP_WEB_BAILEYS",
      queueId: "queue-engineering",
      assignedTo: "agent-2",
      projectId: "project-2",
      channelState: "RECONNECTING",
      search: "Beta"
    })).toHaveLength(1);
    expect(filterUnifiedInbox(unified, { unreadOnly: true })).toHaveLength(1);
    expect(filterUnifiedInbox(unified, { search: "inexistente" })).toHaveLength(0);
  });

  it("aplica unread somente às threads elegíveis após os demais filtros", () => {
    const unified = buildUnifiedInbox([
      thread({ unreadCount: 3 }),
      thread({
        conversationId: "conversation-web",
        providerType: "WHATSAPP_WEB_BAILEYS",
        accountId: "account-web",
        unreadCount: 0,
        capabilities: capabilities("WHATSAPP_WEB_BAILEYS")
      })
    ]);
    expect(filterUnifiedInbox(unified, {
      providerType: "WHATSAPP_WEB_BAILEYS",
      unreadOnly: true
    })).toHaveLength(0);
    expect(filterUnifiedInbox(unified, {
      providerType: "META_CLOUD",
      unreadOnly: true
    })).toHaveLength(1);
  });

  it("permite leitura da conversa mesmo quando envio está indisponível", () => {
    const offline = deriveInboxActionAvailability({
      thread: thread({ channelState: "OFFLINE" }),
      canManage: true,
      operatorPresence: "ONLINE"
    });
    expect(offline.canViewConversation).toBe(true);
    expect(offline.canSend).toBe(false);
    expect(offline.canAssign).toBe(true);
    expect(offline.reason).toBe("Offline");

    const disabledProvider = deriveInboxActionAvailability({
      thread: thread({ capabilities: capabilities("META_CLOUD", false) }),
      canManage: true,
      operatorPresence: "ONLINE"
    });
    expect(disabledProvider.canViewConversation).toBe(true);
    expect(disabledProvider.canSend).toBe(false);
  });

  it("distingue presença do operador da presença do canal", () => {
    const actions = deriveInboxActionAvailability({
      thread: thread({ channelState: "ONLINE" }),
      canManage: true,
      operatorPresence: "OFFLINE"
    });
    expect(actions.canViewConversation).toBe(true);
    expect(actions.canSend).toBe(false);
    expect(actions.canAddNote).toBe(false);
    expect(actions.canAssign).toBe(true);
    expect(actions.reason).toBe("Operador offline");
  });

  it("considera presença expirada como offline e rejeita valores inválidos", () => {
    const now = new Date("2026-08-04T20:00:00.000Z");
    expect(resolveEffectiveOperatorPresence({
      presence: "ONLINE",
      expiresAt: "2026-08-04T20:01:00.000Z",
      now
    })).toBe("ONLINE");
    expect(resolveEffectiveOperatorPresence({
      presence: "BUSY",
      expiresAt: "2026-08-04T19:59:59.000Z",
      now
    })).toBe("OFFLINE");
    expect(resolveEffectiveOperatorPresence({
      presence: "INVALID",
      expiresAt: "2026-08-04T20:01:00.000Z",
      now
    })).toBe("OFFLINE");
    expect(resolveEffectiveOperatorPresence({ presence: "AWAY", now })).toBe("OFFLINE");
  });

  it("respeita capability matrix por thread", () => {
    const actions = deriveInboxActionAvailability({
      thread: thread({
        capabilities: capabilities("META_CLOUD", false),
        channelState: "ONLINE"
      }),
      canManage: true,
      operatorPresence: "ONLINE"
    });
    expect(actions.canViewConversation).toBe(true);
    expect(actions.canSend).toBe(false);
    expect(actions.canStartConversation).toBe(false);
    expect(actions.canAddNote).toBe(true);
  });

  it("rotula providers e estados de forma discreta", () => {
    expect(messagingProviderLabel("META_CLOUD")).toBe("Meta Cloud");
    expect(messagingProviderLabel("WHATSAPP_WEB_BAILEYS")).toBe("WhatsApp Web");
    expect(channelStateLabel("ACTION_REQUIRED")).toBe("Ação necessária");
    expect(channelStateLabel("RECONNECTING")).toBe("Reconectando");
  });
});
