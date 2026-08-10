import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiRetrievalStore, AiSourceDocument } from "./ai";
import {
  createCanonicalMessageAiSource,
  createProjectStatusAiSource,
  rankCanonicalAiSources
} from "./canonical-retrieval";

export class ConversationCanonicalRetrievalStore implements AiRetrievalStore {
  constructor(private readonly options: {
    supabase: SupabaseClient;
    organizationId: string;
    conversationId: string;
    allowedTools: readonly string[];
  }) {}

  async lexicalSearch(input: {
    organizationId: string;
    projectId: string | null;
    query: string;
    limit: number;
  }): Promise<readonly AiSourceDocument[]> {
    if (input.organizationId !== this.options.organizationId) return [];
    const canSearchCanonical = this.options.allowedTools.includes("SEARCH_CANONICAL");
    const canReadProject = this.options.allowedTools.includes("READ_PROJECT_STATUS");
    const sources: AiSourceDocument[] = [];

    const [messagesResult, projectResult] = await Promise.all([
      canSearchCanonical
        ? this.options.supabase
          .from("whatsapp_messages")
          .select("id,body,caption,occurred_at,source_snapshot")
          .eq("organization_id", input.organizationId)
          .eq("conversation_id", this.options.conversationId)
          .not("source_binding_id", "is", null)
          .order("occurred_at", { ascending: false })
          .limit(30)
        : Promise.resolve({ data: [], error: null }),
      canReadProject && input.projectId
        ? this.options.supabase
          .from("projects")
          .select("id,organization_id,code,name,status,updated_at")
          .eq("id", input.projectId)
          .eq("organization_id", input.organizationId)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    if (messagesResult.error) throw new Error(`AI_CANONICAL_MESSAGES_FAILED:${messagesResult.error.code ?? "UNKNOWN"}`);
    if (projectResult.error) throw new Error(`AI_PROJECT_STATUS_FAILED:${projectResult.error.code ?? "UNKNOWN"}`);

    for (const row of messagesResult.data ?? []) {
      const source = createCanonicalMessageAiSource({
        organizationId: input.organizationId,
        projectId: input.projectId,
        messageId: String(row.id),
        body: row.body ? String(row.body) : null,
        caption: row.caption ? String(row.caption) : null,
        occurredAt: String(row.occurred_at),
        sourceSnapshot: row.source_snapshot && typeof row.source_snapshot === "object"
          ? row.source_snapshot as Record<string, unknown>
          : {}
      });
      if (source) sources.push(source);
    }

    if (projectResult.data) {
      sources.push(createProjectStatusAiSource({
        organizationId: input.organizationId,
        projectId: String(projectResult.data.id),
        code: projectResult.data.code ? String(projectResult.data.code) : null,
        name: String(projectResult.data.name),
        status: projectResult.data.status ? String(projectResult.data.status) : null,
        updatedAt: projectResult.data.updated_at ? String(projectResult.data.updated_at) : null
      }));
    }

    return rankCanonicalAiSources(input.query, sources, input.limit);
  }
}
