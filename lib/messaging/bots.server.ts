import "server-only";

import { hasCapability, requireCapability } from "@/lib/authorization";
import { deriveBotReadiness, type BotProfile } from "./bots";
import { openAiMessagingEnvironmentStatus } from "./openai-responses-provider";

function relationName(value: unknown, fallback: string) {
  if (Array.isArray(value)) return relationName(value[0], fallback);
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return String(row.trade_name ?? row.legal_name ?? row.display_name ?? row.name ?? row.code ?? fallback);
  }
  return fallback;
}

function mapProfile(row: Record<string, unknown>): BotProfile {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    enabledForDrafts: Boolean(row.enabled_for_drafts),
    providerId: String(row.provider_id) === "OPENAI" ? "OPENAI" : "DISABLED",
    modelId: row.model_id ? String(row.model_id) : null,
    systemInstructions: String(row.system_instructions),
    retrievalMode: String(row.retrieval_mode) === "HYBRID" ? "HYBRID" : "LEXICAL",
    allowedTools: Array.isArray(row.allowed_tools) ? row.allowed_tools.map(String) as BotProfile["allowedTools"] : [],
    maxOutputTokens: Number(row.max_output_tokens),
    maxCostMicrosPerRun: Number(row.max_cost_micros_per_run),
    priority: Number(row.priority),
    queueId: row.queue_id ? String(row.queue_id) : null,
    projectId: row.project_id ? String(row.project_id) : null
  };
}

export async function loadMessagingBotsWorkspace() {
  const context = await requireCapability("whatsapp", "read");
  const canManage = await hasCapability("whatsapp", "manage", null, context);
  const today = new Date().toISOString().slice(0, 10);
  const [profilesResult, policiesResult, budgetResult, handoffsResult, invocationsResult, queuesResult, projectsResult, conversationsResult] = await Promise.all([
    context.supabase
      .from("channel_bot_profiles")
      .select("id,organization_id,name,description,enabled_for_drafts,provider_id,model_id,system_instructions,retrieval_mode,allowed_tools,max_output_tokens,max_cost_micros_per_run,priority,queue_id,project_id,updated_at")
      .eq("organization_id", context.organizationId)
      .order("priority")
      .order("name"),
    context.supabase
      .from("channel_message_plugin_policies")
      .select("plugin_id,enabled,priority,required_permission,feature_flag,configuration,updated_at")
      .eq("organization_id", context.organizationId)
      .order("priority"),
    context.supabase
      .from("channel_ai_budget_daily")
      .select("maximum_cost_micros,reserved_cost_micros,committed_cost_micros,usage_date")
      .eq("organization_id", context.organizationId)
      .eq("usage_date", today)
      .maybeSingle(),
    context.supabase
      .from("channel_ai_handoffs")
      .select("id,conversation_id,reason,status,summary,created_at,resolved_at")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(20),
    context.supabase
      .from("channel_ai_invocations")
      .select("id,conversation_id,provider_id,model_id,status,input_tokens,output_tokens,estimated_cost_micros,claim_validation,prompt_injection_signals_removed,created_at")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(30),
    context.supabase
      .from("channel_inbox_queues")
      .select("id,name,active")
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("priority"),
    context.supabase
      .from("projects")
      .select("id,code,name,status")
      .eq("organization_id", context.organizationId)
      .is("archived_at", null)
      .order("name")
      .limit(300),
    context.supabase
      .from("whatsapp_conversations")
      .select("id,project_id,assigned_to,status,whatsapp_contacts(display_name,phone_e164),projects(code,name)")
      .eq("organization_id", context.organizationId)
      .neq("status", "ARCHIVED")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200)
  ]);

  const results = [profilesResult, policiesResult, budgetResult, handoffsResult, invocationsResult, queuesResult, projectsResult, conversationsResult];
  const errors = results.map(result => result.error).filter(Boolean);
  if (errors.length) throw new Error(`BOTS_WORKSPACE_QUERY_FAILED:${errors.map(error => error?.code ?? "UNKNOWN").join(",")}`);

  const profiles = ((profilesResult.data ?? []) as Array<Record<string, unknown>>).map(mapProfile);
  const policies = (policiesResult.data ?? []).map(row => ({
    pluginId: String(row.plugin_id),
    enabled: Boolean(row.enabled),
    priority: Number(row.priority),
    requiredPermission: row.required_permission ? String(row.required_permission) : null,
    featureFlag: row.feature_flag ? String(row.feature_flag) : null,
    configuration: row.configuration && typeof row.configuration === "object" ? row.configuration as Record<string, unknown> : {}
  }));
  const budgetRow = budgetResult.data as Record<string, unknown> | null;
  const budget = {
    maximumCostMicros: Number(budgetRow?.maximum_cost_micros ?? 0),
    reservedCostMicros: Number(budgetRow?.reserved_cost_micros ?? 0),
    committedCostMicros: Number(budgetRow?.committed_cost_micros ?? 0)
  };
  const provider = openAiMessagingEnvironmentStatus();
  const consentEnabled = policies.some(policy => policy.pluginId === "CONSENT" && policy.enabled);
  const aiEnabled = policies.some(policy => policy.pluginId === "AI_FALLBACK" && policy.enabled);

  return {
    organizationId: context.organizationId,
    canManage,
    profiles: profiles.map(profile => ({
      ...profile,
      readiness: deriveBotReadiness({
        profile,
        providerConfigured: provider.configured,
        providerModel: provider.model,
        dailyBudgetMicros: budget.maximumCostMicros,
        consentPluginEnabled: consentEnabled,
        aiPluginEnabled: aiEnabled
      })
    })),
    provider: {
      configured: provider.configured,
      model: provider.model,
      missingVariables: provider.missingVariables
    },
    policies,
    budget,
    queues: (queuesResult.data ?? []).map(row => ({ id: String(row.id), name: String(row.name) })),
    projects: (projectsResult.data ?? []).map(row => ({
      id: String(row.id),
      label: `${String(row.code ?? "")} · ${String(row.name)}`.replace(/^ · /, ""),
      status: String(row.status ?? "")
    })),
    conversations: (conversationsResult.data ?? []).map(row => ({
      id: String(row.id),
      projectId: row.project_id ? String(row.project_id) : null,
      humanAssigned: Boolean(row.assigned_to),
      label: `${relationName(row.whatsapp_contacts, "Contato")} · ${relationName(row.projects, "Sem obra")}`
    })),
    handoffs: handoffsResult.data ?? [],
    invocations: invocationsResult.data ?? []
  };
}
