import "server-only";

import { hasCapability, requireCapability } from "@/lib/authorization";
import { deriveMessagingUiCapabilities } from "@/lib/messaging/capabilities";
import { resolveMetaCloudRuntimePolicy } from "@/lib/messaging/policy.server";

function relationName(value: unknown, fallback: string) {
  if (Array.isArray(value)) return relationName(value[0], fallback);
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return String(row.title ?? row.name ?? row.code ?? fallback);
  }
  return fallback;
}

export async function loadWhatsAppWorkspace(selectedConversationId?: string | null) {
  const context = await requireCapability("whatsapp", "read");
  const canManage = await hasCapability("whatsapp", "manage", null, context);

  const [
    accountsResult,
    conversationsResult,
    bindingsResult,
    clientsResult,
    projectsResult,
    contractTemplatesResult,
    proposalVersionsResult,
    contractVersionsResult,
    amendmentVersionsResult,
    projectDocumentVersionsResult
  ] = await Promise.all([
    context.supabase
      .from("whatsapp_accounts")
      .select("id,waba_id,phone_number_id,display_phone_number,business_name,active,is_default")
      .eq("organization_id", context.organizationId)
      .order("is_default", { ascending: false }),
    context.supabase
      .from("whatsapp_conversations")
      .select(
        "id,account_id,status,client_id,project_id,contract_id,sac_ticket_id,assigned_to,last_customer_message_at,last_message_at,unread_count,whatsapp_contacts(display_name,profile_name,phone_e164,wa_id),clients(legal_name,trade_name),projects(code,name)"
      )
      .eq("organization_id", context.organizationId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200),
    context.supabase
      .from("whatsapp_content_bindings")
      .select(
        "id,name,source_type,source_id,source_field,meta_template_name,language_code,parameter_order,active"
      )
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("name"),
    context.supabase
      .from("clients")
      .select("id,legal_name,trade_name,phone")
      .eq("organization_id", context.organizationId)
      .is("archived_at", null)
      .order("legal_name")
      .limit(300),
    context.supabase
      .from("projects")
      .select("id,client_id,code,name,status")
      .eq("organization_id", context.organizationId)
      .is("archived_at", null)
      .order("name")
      .limit(300),
    context.supabase
      .from("contract_templates")
      .select("id,name,version_number")
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("name"),
    context.supabase
      .from("proposal_versions")
      .select("id,version_number,title,document_path")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(50),
    context.supabase
      .from("contract_versions")
      .select("id,version_number,document_path,contracts(title,code)")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(50),
    context.supabase
      .from("amendment_versions")
      .select("id,version_number,document_path,amendments(code)")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(50),
    context.supabase
      .from("project_document_versions")
      .select("id,version_number,file_name,project_documents(title,code)")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  const accounts = accountsResult.data ?? [];
  const conversations = conversationsResult.data ?? [];
  const selectedId =
    selectedConversationId && conversations.some(item => item.id === selectedConversationId)
      ? selectedConversationId
      : conversations[0]?.id ?? null;
  const selectedConversation = conversations.find(item => item.id === selectedId);

  const runtimePolicy = resolveMetaCloudRuntimePolicy(context.organizationId);
  const providerPolicy = runtimePolicy.policy;
  const metaUiCapabilities = runtimePolicy.ui;
  const accountCapabilities = Object.fromEntries(
    accounts.map(account => [account.id, metaUiCapabilities])
  );
  const selectedMessagingCapabilities = selectedConversation?.account_id
    ? accountCapabilities[selectedConversation.account_id] ??
      deriveMessagingUiCapabilities(runtimePolicy.matrix, false)
    : metaUiCapabilities;

  const messagesResult = selectedId
    ? await context.supabase
        .from("whatsapp_messages")
        .select(
          "id,direction,message_type,status,body,caption,source_binding_id,source_snapshot,error_code,error_message,occurred_at"
        )
        .eq("conversation_id", selectedId)
        .eq("organization_id", context.organizationId)
        .order("occurred_at", { ascending: true })
        .limit(500)
    : { data: [], error: null };

  const sourceCatalog = [
    ...(contractTemplatesResult.data ?? []).map(item => ({
      token: `CONTRACT_TEMPLATE|${item.id}|BODY_TEMPLATE`,
      label: `${item.name} · modelo contratual V${item.version_number}`
    })),
    ...(proposalVersionsResult.data ?? []).flatMap(item => [
      {
        token: `PROPOSAL_VERSION|${item.id}|COMMERCIAL_SUMMARY`,
        label: `${item.title} · resumo comercial V${item.version_number}`
      },
      ...(item.document_path
        ? [
            {
              token: `PROPOSAL_VERSION|${item.id}|DOCUMENT`,
              label: `${item.title} · documento V${item.version_number}`
            }
          ]
        : [])
    ]),
    ...(contractVersionsResult.data ?? []).flatMap(item => {
      const name = relationName(item.contracts, "Contrato");
      return [
        {
          token: `CONTRACT_VERSION|${item.id}|RENDERED_BODY`,
          label: `${name} · corpo contratual V${item.version_number}`
        },
        ...(item.document_path
          ? [
              {
                token: `CONTRACT_VERSION|${item.id}|DOCUMENT`,
                label: `${name} · documento V${item.version_number}`
              }
            ]
          : [])
      ];
    }),
    ...(amendmentVersionsResult.data ?? []).flatMap(item => {
      const name = relationName(item.amendments, "Aditivo");
      return [
        {
          token: `AMENDMENT_VERSION|${item.id}|RENDERED_BODY`,
          label: `${name} · texto V${item.version_number}`
        },
        ...(item.document_path
          ? [
              {
                token: `AMENDMENT_VERSION|${item.id}|DOCUMENT`,
                label: `${name} · documento V${item.version_number}`
              }
            ]
          : [])
      ];
    }),
    ...(projectDocumentVersionsResult.data ?? []).map(item => ({
      token: `PROJECT_DOCUMENT_VERSION|${item.id}|DOCUMENT`,
      label: `${relationName(item.project_documents, item.file_name)} · documento V${item.version_number}`
    }))
  ];

  return {
    context,
    canManage,
    accounts,
    conversations,
    bindings: bindingsResult.data ?? [],
    clients: clientsResult.data ?? [],
    projects: projectsResult.data ?? [],
    sourceCatalog,
    selectedConversationId: selectedId,
    messages: messagesResult.data ?? [],
    providerPolicy,
    accountCapabilities,
    selectedMessagingCapabilities,
    errors: [
      accountsResult.error,
      conversationsResult.error,
      bindingsResult.error,
      clientsResult.error,
      projectsResult.error,
      contractTemplatesResult.error,
      proposalVersionsResult.error,
      contractVersionsResult.error,
      amendmentVersionsResult.error,
      projectDocumentVersionsResult.error,
      messagesResult.error,
      ...(!providerPolicy.configurationValid
        ? [{ code: "MESSAGING_PROVIDER_FLAGS_INVALID" }]
        : [])
    ]
      .filter(Boolean)
      .map(error => String(error?.code ?? "QUERY_FAILED"))
  };
}
