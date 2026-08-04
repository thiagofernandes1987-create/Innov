import { createHash } from "node:crypto";
import type { AiSourceDocument } from "./ai";

export const BOT_TEST_IMPLEMENTED_TOOLS = [
  "SEARCH_CANONICAL",
  "READ_PROJECT_STATUS"
] as const;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function words(value: string) {
  return [...new Set(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .split(/[^a-z0-9]+/)
      .filter(word => word.length >= 3)
  )];
}

export function createProjectStatusAiSource(input: {
  organizationId: string;
  projectId: string;
  code: string | null;
  name: string;
  status: string | null;
  updatedAt?: string | null;
}): AiSourceDocument {
  const content = [
    `Obra: ${input.name}.`,
    input.code ? `Código: ${input.code}.` : "",
    input.status ? `Status cadastrado: ${input.status}.` : "Status cadastrado não informado.",
    input.updatedAt ? `Última atualização registrada: ${input.updatedAt}.` : ""
  ].filter(Boolean).join(" ");
  return {
    id: `PROJECT_STATUS:${input.projectId}`,
    organizationId: input.organizationId,
    projectId: input.projectId,
    version: 1,
    validFrom: null,
    validUntil: null,
    title: `Status da obra ${input.code ?? input.name}`,
    content,
    sha256: sha256(content),
    trust: "CANONICAL"
  };
}

export function createCanonicalMessageAiSource(input: {
  organizationId: string;
  projectId: string | null;
  messageId: string;
  body: string | null;
  caption: string | null;
  occurredAt: string;
  sourceSnapshot: Record<string, unknown>;
}): AiSourceDocument | null {
  const content = String(input.body ?? input.caption ?? "").trim();
  if (!content) return null;
  const sourceSha = String(input.sourceSnapshot.sha256 ?? "");
  const sourceVersion = Number(input.sourceSnapshot.sourceVersion ?? 1);
  return {
    id: `CANONICAL_MESSAGE:${input.messageId}`,
    organizationId: input.organizationId,
    projectId: input.projectId,
    version: Number.isInteger(sourceVersion) && sourceVersion > 0 ? sourceVersion : 1,
    validFrom: input.occurredAt,
    validUntil: null,
    title: String(input.sourceSnapshot.sourceName ?? "Mensagem canônica da conversa"),
    content,
    sha256: /^[a-f0-9]{64}$/i.test(sourceSha) ? sourceSha : sha256(content),
    trust: "CANONICAL"
  };
}

export function rankCanonicalAiSources(
  query: string,
  sources: readonly AiSourceDocument[],
  limit: number
) {
  const queryWords = words(query);
  return [...sources]
    .map((source, index) => {
      const title = source.title.toLocaleLowerCase("pt-BR");
      const content = source.content.toLocaleLowerCase("pt-BR");
      const score = queryWords.reduce((total, word) => {
        const titleScore = title.includes(word) ? 5 : 0;
        const contentMatches = content.split(word).length - 1;
        return total + titleScore + Math.min(contentMatches, 5);
      }, 0);
      return { source, score, index };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, Math.max(0, limit))
    .map(item => item.source);
}
