import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrganizationContext } from "@/lib/auth";
import { WhatsAppDomainError } from "./domain";
import type { WhatsAppDashboardData } from "./types";

export async function getWhatsAppDashboard(selectedConversationId?: string | null): Promise<WhatsAppDashboardData> {
  const context = await requireOrganizationContext();

  const [
    accountsResult,
    conversationsResult,
    contactsResult,
    templatesResult,
    automationResult,
    sourcesResult,
    projectsResult,
    contractTemplatesResult,
    proposalVersionsResult,
    contractVersionsResult,
    amendmentVersionsResult,
    projectDocumentVersionsResult
  ] = await Promise.all([
    context.supabase
      .from("whatsapp_accounts")
      .select("id,name,phone_number,status,provider,health_status,last_connected_at")
      .eq("organization_id", context.organizationId)
      .order("name"),
    context.supabase
      .from("whatsapp_conversations")
      .select("id,contact_id,status,assigned_to,last_message_at,unread_count,whatsapp_contacts(id,display_name,phone_number)")
      .eq("organization_id", context.organizationId)
      .order("last_message_at", { ascending: false })
      .limit(100),
    context.supabase
      .from("whatsapp_contacts")
      .select("id,display_name,phone_number,client_id,lead_id")
      .eq("organization_id", context.organizationId)
      .order("display_name")
      .limit(300),
    context.supabase
      .from("whatsapp_templates")
      .select("id,name,category,status,language,provider_template_name")
      .eq("organization_id", context.organizationId)
      .order("name"),
    context.supabase
      .from("whatsapp_automation_rules")
      .select("id,name,trigger_type,enabled,priority")
      .eq("organization_id", context.organizationId)
      .order("priority"),
    context.supabase
      .from("whatsapp_content_bindings")
      .select("id,name,source_type,source_id,source_field,active")
      .eq("organization_id", context.organizationId)
      .order("name"),
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
      .select("id,version_number,document_path,contracts!contract_versions_contract_id_fkey(title,code)")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(50),
    context.supabase
      .from("amendment_versions")
      .select("id,version_number,document_path,amendments!amendment_versions_amendment_id_fkey(code)")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(50),
    context.supabase
      .from("project_document_versions")
      .select("id,version_number,file_name,project_documents!project_document_versions_document_id_fkey(title,code)")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  const conversations = conversationsResult.data ?? [];
  const selectedId =
    selectedConversationId && conversations.some(item => item.id === selectedConversationId)
      ? selectedConversationId
      : conversations[0]?.id ?? null;

  const messagesResult = selectedId
    ? await context.supabase
        .from("whatsapp_messages")
        .select("id,conversation_id,direction,type,status,text_body,created_at,sent_at,delivered_at,read_at,failed_at,error_code,error_message,source_snapshot")
        .eq("organization_id", context.organizationId)
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true })
        .limit(300)
    : { data: [], error: null };

  const errors = [
    accountsResult.error,
    conversationsResult.error,
    contactsResult.error,
    templatesResult.error,
    automationResult.error,
    sourcesResult.error,
    projectsResult.error,
    contractTemplatesResult.error,
    proposalVersionsResult.error,
    contractVersionsResult.error,
    amendmentVersionsResult.error,
    projectDocumentVersionsResult.error,
    messagesResult.error
  ].filter(Boolean);

  if (errors.length) {
    throw new WhatsAppDomainError("DASHBOARD_LOAD_FAILED", errors[0]?.message ?? "Falha ao carregar WhatsApp.");
  }

  return {
    context,
    accounts: accountsResult.data ?? [],
    conversations,
    contacts: contactsResult.data ?? [],
    templates: templatesResult.data ?? [],
    automationRules: automationResult.data ?? [],
    contentBindings: sourcesResult.data ?? [],
    projects: projectsResult.data ?? [],
    contractTemplates: contractTemplatesResult.data ?? [],
    proposalVersions: proposalVersionsResult.data ?? [],
    contractVersions: contractVersionsResult.data ?? [],
    amendmentVersions: amendmentVersionsResult.data ?? [],
    projectDocumentVersions: projectDocumentVersionsResult.data ?? [],
    selectedConversationId: selectedId,
    messages: messagesResult.data ?? []
  };
}

export async function getWhatsAppAdminClient() {
  const context = await requireOrganizationContext();
  return { context, supabase: await createSupabaseServerClient() };
}
