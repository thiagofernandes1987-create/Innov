import "server-only";

import { requireCapability } from "@/lib/authorization";
import {
  BAILEYS_PLANNED_CAPABILITY_MATRIX,
  WEB_CHAT_PLANNED_CAPABILITY_MATRIX,
  deriveMessagingUiCapabilities
} from "@/lib/messaging/capabilities";
import type { ChannelProviderType } from "@/lib/messaging/domain";
import {
  buildUnifiedInbox,
  filterUnifiedInbox,
  messagingProviderLabel,
  type InboxChannelState,
  type InboxFilters,
  type InboxThread
} from "@/lib/messaging/inbox";
import { resolveMetaCloudRuntimePolicy } from "@/lib/messaging/policy.server";

function firstRelation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return firstRelation(value[0]);
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function providerType(value: unknown): ChannelProviderType {
  const candidate = String(value ?? "META_CLOUD") as ChannelProviderType;
  return candidate;
}

function channelState(value: unknown, providerStatus: unknown): InboxChannelState {
  const explicit = String(value ?? "");
  if (["ONLINE", "OFFLINE", "RECONNECTING", "DEGRADED", "ACTION_REQUIRED"].includes(explicit)) {
    return explicit as InboxChannelState;
  }
  switch (String(providerStatus ?? "ENABLED")) {
    case "ENABLED": return "ONLINE";
    case "DISABLED": return "OFFLINE";
    case "DEGRADED": return "DEGRADED";
    case "ACTION_REQUIRED": return "ACTION_REQUIRED";
    default: return "OFFLINE";
  }
}

function capabilitiesFor(organizationId: string, type: ChannelProviderType) {
  if (type === "META_CLOUD") {
    return resolveMetaCloudRuntimePolicy(organizationId).uiCapabilities;
  }
  if (type === "WHATSAPP_WEB_BAILEYS") {
    return deriveMessagingUiCapabilities(BAILEYS_PLANNED_CAPABILITY_MATRIX, false);
  }
  return deriveMessagingUiCapabilities(WEB_CHAT_PLANNED_CAPABILITY_MATRIX, false);
}

export async function loadMultiproviderInbox(input: {
  conversationId?: string | null;
  filters?: InboxFilters;
}) {
  const context = await requireCapability("whatsapp", "read");
  const [conversationResult, queueResult, presenceResult, noteResult] = await Promise.all([
    context.supabase
      .from("whatsapp_conversations")
      .select(`
        id, organization_id, account_id, contact_id, project_id, status,
        last_message_at, unread_count, assigned_to, queue_id, ownership_version,
        channel_state, last_actor_kind,
        whatsapp_contacts(id, display_name, phone_e164),
        whatsapp_accounts(id, business_name, display_phone_number, provider_type, provider_account_id, provider_status),
        projects(id, name)
      `)
      .eq("organization_id", context.organizationId)
      .neq("status", "ARCHIVED")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(500),
    context.supabase
      .from("channel_inbox_queues")
      .select("id, name, description, priority, active")
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("priority", { ascending: true }),
    context.supabase
      .from("channel_operator_presence")
      .select("presence, active_conversation_id, expires_at, version")
      .eq("organization_id", context.organizationId)
      .eq("user_id", context.userId)
      .maybeSingle(),
    input.conversationId
      ? context.supabase
        .from("channel_conversation_notes")
        .select("id, body, created_at, created_by")
        .eq("organization_id", context.organizationId)
        .eq("conversation_id", input.conversationId)
        .order("created_at", { ascending: false })
        .limit(20)
      : Promise.resolve({ data: [], error: null })
  ]);

  for (const result of [conversationResult, queueResult, presenceResult, noteResult]) {
    if (result.error) throw new Error(`INBOX_QUERY_FAILED:${result.error.code ?? "UNKNOWN"}`);
  }

  const queueRows = (queueResult.data ?? []) as Array<Record<string, unknown>>;
  const queueNames = new Map(queueRows.map(row => [String(row.id), String(row.name)]));
  const threads: InboxThread[] = ((conversationResult.data ?? []) as Array<Record<string, unknown>>)
    .map(row => {
      const contact = firstRelation(row.whatsapp_contacts);
      const account = firstRelation(row.whatsapp_accounts);
      const project = firstRelation(row.projects);
      const type = providerType(account?.provider_type);
      const queueId = row.queue_id ? String(row.queue_id) : null;
      return {
        conversationId: String(row.id),
        contactId: String(row.contact_id),
        contactName: String(contact?.display_name ?? contact?.phone_e164 ?? "Contato"),
        accountId: String(row.account_id),
        providerType: type,
        providerAccountId: String(account?.provider_account_id ?? ""),
        providerLabel: messagingProviderLabel(type),
        channelState: channelState(row.channel_state, account?.provider_status),
        queueId,
        queueName: queueId ? queueNames.get(queueId) ?? null : null,
        assignedTo: row.assigned_to ? String(row.assigned_to) : null,
        assignedName: row.assigned_to ? "Responsável atribuído" : null,
        projectId: row.project_id ? String(row.project_id) : null,
        projectName: project?.name ? String(project.name) : null,
        status: String(row.status ?? "OPEN"),
        unreadCount: Number(row.unread_count ?? 0),
        lastMessageAt: row.last_message_at ? String(row.last_message_at) : null,
        lastActorKind: String(row.last_actor_kind ?? "HUMAN") as InboxThread["lastActorKind"],
        capabilities: capabilitiesFor(context.organizationId, type)
      };
    });
  const unified = filterUnifiedInbox(buildUnifiedInbox(threads), input.filters ?? {});
  const selectedThread = threads.find(item => item.conversationId === input.conversationId) ?? null;
  const selectedRow = ((conversationResult.data ?? []) as Array<Record<string, unknown>>)
    .find(row => String(row.id) === input.conversationId) ?? null;

  return {
    organizationId: context.organizationId,
    currentUserId: context.userId,
    canManage: context.access.manage,
    unified,
    selectedThread,
    selectedOwnershipVersion: Number(selectedRow?.ownership_version ?? 0),
    queues: queueRows.map(row => ({
      id: String(row.id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      priority: Number(row.priority ?? 100)
    })),
    presence: String((presenceResult.data as Record<string, unknown> | null)?.presence ?? "ONLINE") as "ONLINE" | "AWAY" | "BUSY" | "OFFLINE",
    notes: ((noteResult.data ?? []) as Array<Record<string, unknown>>).map(row => ({
      id: String(row.id),
      body: String(row.body),
      createdAt: String(row.created_at),
      createdBy: row.created_by ? String(row.created_by) : null
    }))
  };
}
