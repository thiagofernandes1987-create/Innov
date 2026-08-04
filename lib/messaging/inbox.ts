import type { MessagingUiCapabilities } from "./capabilities";
import type { ChannelProviderType } from "./domain";

export type InboxChannelState =
  | "ONLINE"
  | "OFFLINE"
  | "RECONNECTING"
  | "DEGRADED"
  | "ACTION_REQUIRED";
export type InboxActorKind = "HUMAN" | "AUTOMATION" | "AI" | "SYSTEM";
export type OperatorPresence = "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";

export type InboxThread = {
  conversationId: string;
  contactId: string;
  contactName: string;
  accountId: string;
  providerType: ChannelProviderType;
  providerAccountId: string;
  providerLabel: string;
  channelState: InboxChannelState;
  queueId?: string | null;
  queueName?: string | null;
  assignedTo?: string | null;
  assignedName?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  status: string;
  unreadCount: number;
  lastMessageAt?: string | null;
  lastActorKind: InboxActorKind;
  capabilities: MessagingUiCapabilities;
};

export type UnifiedInboxConversation = {
  contactId: string;
  contactName: string;
  threads: readonly InboxThread[];
  unreadCount: number;
  lastMessageAt?: string | null;
  providerTypes: readonly ChannelProviderType[];
  channelStates: readonly InboxChannelState[];
  assignedTo?: string | null;
  queueId?: string | null;
  conflictingOwnership: boolean;
};

export type InboxFilters = {
  providerType?: ChannelProviderType | null;
  accountId?: string | null;
  queueId?: string | null;
  assignedTo?: string | null;
  projectId?: string | null;
  channelState?: InboxChannelState | null;
  unreadOnly?: boolean;
  search?: string | null;
};

export type InboxActionAvailability = {
  canViewConversation: boolean;
  canSend: boolean;
  canStartConversation: boolean;
  canAssign: boolean;
  canTransfer: boolean;
  canAddNote: boolean;
  reason?: string | null;
};

const providerLabels: Readonly<Partial<Record<ChannelProviderType, string>>> = {
  META_CLOUD: "Meta Cloud",
  WHATSAPP_WEB_BAILEYS: "WhatsApp Web",
  WEB_CHAT: "Chat Web"
};

export function messagingProviderLabel(providerType: ChannelProviderType): string {
  return providerLabels[providerType] ?? providerType.replaceAll("_", " ");
}

export function channelStateLabel(state: InboxChannelState): string {
  switch (state) {
    case "ONLINE": return "Online";
    case "OFFLINE": return "Offline";
    case "RECONNECTING": return "Reconectando";
    case "DEGRADED": return "Degradado";
    case "ACTION_REQUIRED": return "Ação necessária";
  }
}

export function resolveEffectiveOperatorPresence(input: {
  presence?: unknown;
  expiresAt?: unknown;
  now?: Date;
}): OperatorPresence {
  const presence = String(input.presence ?? "ONLINE");
  const normalized = (["ONLINE", "AWAY", "BUSY", "OFFLINE"] as const).includes(
    presence as OperatorPresence
  )
    ? presence as OperatorPresence
    : "OFFLINE";
  if (normalized === "OFFLINE") return "OFFLINE";
  if (!input.expiresAt) return "OFFLINE";
  const expiresAt = new Date(String(input.expiresAt)).getTime();
  const now = (input.now ?? new Date()).getTime();
  return Number.isFinite(expiresAt) && expiresAt > now ? normalized : "OFFLINE";
}

export function buildUnifiedInbox(threads: readonly InboxThread[]): UnifiedInboxConversation[] {
  const grouped = new Map<string, InboxThread[]>();
  for (const thread of threads) {
    const current = grouped.get(thread.contactId) ?? [];
    current.push(thread);
    grouped.set(thread.contactId, current);
  }
  return [...grouped.entries()].map(([contactId, contactThreads]) => {
    const sorted = [...contactThreads].sort((left, right) =>
      Date.parse(right.lastMessageAt ?? "1970-01-01") - Date.parse(left.lastMessageAt ?? "1970-01-01")
    );
    const owners = new Set(sorted.map(item => item.assignedTo).filter(Boolean));
    const queues = new Set(sorted.map(item => item.queueId).filter(Boolean));
    return {
      contactId,
      contactName: sorted[0]?.contactName ?? "Contato",
      threads: sorted,
      unreadCount: sorted.reduce((sum, item) => sum + Math.max(0, item.unreadCount), 0),
      lastMessageAt: sorted[0]?.lastMessageAt ?? null,
      providerTypes: [...new Set(sorted.map(item => item.providerType))],
      channelStates: [...new Set(sorted.map(item => item.channelState))],
      assignedTo: owners.size === 1 ? sorted.find(item => item.assignedTo)?.assignedTo ?? null : null,
      queueId: queues.size === 1 ? sorted.find(item => item.queueId)?.queueId ?? null : null,
      conflictingOwnership: owners.size > 1 || queues.size > 1
    };
  }).sort((left, right) =>
    Date.parse(right.lastMessageAt ?? "1970-01-01") - Date.parse(left.lastMessageAt ?? "1970-01-01")
  );
}

export function filterUnifiedInbox(
  conversations: readonly UnifiedInboxConversation[],
  filters: InboxFilters
): UnifiedInboxConversation[] {
  const search = filters.search?.trim().toLocaleLowerCase("pt-BR") ?? "";
  return conversations.filter(conversation => {
    const eligibleThreads = conversation.threads.filter(thread =>
      (!filters.providerType || thread.providerType === filters.providerType) &&
      (!filters.accountId || thread.accountId === filters.accountId) &&
      (!filters.queueId || thread.queueId === filters.queueId) &&
      (!filters.assignedTo || thread.assignedTo === filters.assignedTo) &&
      (!filters.projectId || thread.projectId === filters.projectId) &&
      (!filters.channelState || thread.channelState === filters.channelState)
    );
    if (!eligibleThreads.length) return false;
    if (filters.unreadOnly && eligibleThreads.every(thread => thread.unreadCount <= 0)) return false;
    if (search && ![
      conversation.contactName,
      ...eligibleThreads.flatMap(item => [item.projectName ?? "", item.queueName ?? "", item.assignedName ?? ""])
    ].some(value => value.toLocaleLowerCase("pt-BR").includes(search))) return false;
    return true;
  });
}

export function deriveInboxActionAvailability(input: {
  thread: InboxThread;
  canManage: boolean;
  operatorPresence: OperatorPresence;
}): InboxActionAvailability {
  const channelAvailable = input.thread.channelState === "ONLINE";
  const humanAvailable = input.operatorPresence !== "OFFLINE";
  if (!channelAvailable) {
    return {
      canViewConversation: true,
      canSend: false,
      canStartConversation: false,
      canAssign: input.canManage,
      canTransfer: input.canManage && Boolean(input.thread.assignedTo),
      canAddNote: humanAvailable,
      reason: channelStateLabel(input.thread.channelState)
    };
  }
  return {
    canViewConversation: true,
    canSend: input.thread.capabilities.canSendAny && humanAvailable,
    canStartConversation: input.thread.capabilities.canStartConversation && humanAvailable,
    canAssign: input.canManage,
    canTransfer: input.canManage && Boolean(input.thread.assignedTo),
    canAddNote: humanAvailable,
    reason: humanAvailable ? null : "Operador offline"
  };
}
