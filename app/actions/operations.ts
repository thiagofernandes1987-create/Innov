"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccessAdministration } from "@/lib/authorization";
import { requireOrganizationContext } from "@/lib/auth";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { MODULE_BY_KEY } from "@/lib/modules/registry";
import { PERSONAS_OPERACIONAIS, type PersonaId } from "@/lib/personas/runtime";
import { campoDeTexto } from "@/lib/forms/campos";

const PERSONA_IDS = new Set(PERSONAS_OPERACIONAIS.map(persona => persona.id));
const ROTA = "/app/administracao/responsabilidades";
const ROTA_EXCECOES = "/app/excecoes";
const MENSAGEM_BANCO = "Não foi possível concluir a operação. Tente novamente e, se o problema persistir, informe o horário ao administrador.";

function value(formData: FormData, key: string): string {
  return campoDeTexto(formData, key).trim();
}

function fail(message: string): never {
  redirect(`${ROTA}?error=${encodeURIComponent(message)}`);
}

function failExceptions(message: string): never {
  redirect(`${ROTA_EXCECOES}?error=${encodeURIComponent(message)}`);
}

function failDatabase(context: string, error: unknown, route: "responsabilidades" | "excecoes"): never {
  reportDataAccessError(context, error as { code?: string | null; statusCode?: string | number | null; name?: string | null });
  if (route === "excecoes") failExceptions(MENSAGEM_BANCO);
  fail(MENSAGEM_BANCO);
}

function validTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function responseDueAt(responseDueOn: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(responseDueOn)) return null;
  const parsed = new Date(`${responseDueOn}T23:59:59-03:00`);
  if (!Number.isFinite(parsed.getTime()) || parsed.getTime() <= Date.now()) return null;
  return parsed.toISOString();
}

export async function salvarResponsabilidadeOperacional(formData: FormData): Promise<void> {
  const context = await requireAccessAdministration();
  const userId = value(formData, "userId");
  const personaId = value(formData, "personaId") as PersonaId;
  const projectId = value(formData, "projectId") || null;
  const quietFrom = value(formData, "quietFrom") || null;
  const quietUntil = value(formData, "quietUntil") || null;
  const timezone = value(formData, "timezone") || "America/Sao_Paulo";

  if (!userId || !PERSONA_IDS.has(personaId)) {
    fail("Selecione um usuário e uma profissão válidos.");
  }
  if (Boolean(quietFrom) !== Boolean(quietUntil)) {
    fail("Informe início e fim da janela silenciosa, ou deixe os dois vazios.");
  }
  if (!validTimezone(timezone)) fail("Fuso horário inválido.");

  const membership = await context.supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", context.organizationId)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (membership.error) failDatabase("operations.responsibility.membership", membership.error, "responsabilidades");
  if (!membership.data) fail("Usuário não é membro ativo desta organização.");
  const isClient = membership.data.role === "CLIENTE";
  if ((personaId === "P15") !== isClient) {
    fail("A cadeira Cliente só pode ser atribuída a um cliente ativo, e vice-versa.");
  }

  let existingQuery = context.supabase
    .from("operational_responsibilities")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("user_id", userId)
    .eq("persona_id", personaId);
  existingQuery = projectId
    ? existingQuery.eq("project_id", projectId)
    : existingQuery.is("project_id", null);
  const existing = await existingQuery.maybeSingle();
  if (existing.error) failDatabase("operations.responsibility.lookup", existing.error, "responsabilidades");

  const payload = {
    active: true,
    quiet_from: quietFrom,
    quiet_until: quietUntil,
    timezone,
    assigned_by: context.userId,
    assigned_at: new Date().toISOString()
  };
  const result = existing.data
    ? await context.supabase
        .from("operational_responsibilities")
        .update(payload)
        .eq("id", existing.data.id)
        .eq("organization_id", context.organizationId)
    : await context.supabase
        .from("operational_responsibilities")
        .insert({
          ...payload,
          organization_id: context.organizationId,
          project_id: projectId,
          persona_id: personaId,
          user_id: userId
        });

  if (result.error) failDatabase("operations.responsibility.save", result.error, "responsabilidades");
  revalidatePath(ROTA);
}

export async function desativarResponsabilidadeOperacional(formData: FormData): Promise<void> {
  const context = await requireAccessAdministration();
  const responsibilityId = value(formData, "responsibilityId");
  if (!responsibilityId) fail("Responsabilidade inválida.");

  const { error } = await context.supabase
    .from("operational_responsibilities")
    .update({ active: false })
    .eq("id", responsibilityId)
    .eq("organization_id", context.organizationId);
  if (error) failDatabase("operations.responsibility.disable", error, "responsabilidades");
  revalidatePath(ROTA);
}

/**
 * Registra uma exceção real da operação e aciona a matriz de destinatários.
 *
 * A UI não inventa eventos automáticos. O usuário só pode originar o cenário
 * pessimista da persona que lhe foi formalmente atribuída, e a RPC repete as
 * mesmas garantias no banco antes de criar evento/notificações.
 */
export async function registrarExcecaoOperacional(formData: FormData): Promise<void> {
  const context = await requireOrganizationContext();
  const eventCode = value(formData, "eventCode");
  const projectId = value(formData, "projectId") || null;
  const moduleKey = value(formData, "moduleKey");
  const title = value(formData, "title");
  const impact = value(formData, "impact");
  const obligationPersona = value(formData, "obligationPersona") as PersonaId;
  const due = responseDueAt(value(formData, "responseDueOn"));
  const evidenceText = value(formData, "evidence");
  const clientApproved = value(formData, "clientApproved") === "on";
  const deduplicationKey = value(formData, "deduplicationKey") || randomUUID();

  const persona = PERSONAS_OPERACIONAIS.find(item => item.scenarios.pessimistic.event === eventCode);
  if (!persona) failExceptions("Tipo de exceção operacional inválido.");
  if (!title || title.length > 160) failExceptions("Informe um título de até 160 caracteres.");
  if (!impact || impact.length > 1200) failExceptions("Descreva o impacto em até 1.200 caracteres.");
  if (evidenceText.length > 3000) failExceptions("A evidência textual deve ter no máximo 3.000 caracteres.");
  if (!due) failExceptions("Informe uma data futura para a resposta.");
  if (!MODULE_BY_KEY.has(moduleKey) || !persona.modules.includes(moduleKey)) {
    failExceptions("O aplicativo selecionado não pertence à atuação desta cadeira profissional.");
  }
  if (!persona.scenarios.pessimistic.notify.includes(obligationPersona)) {
    failExceptions("O responsável pela resposta não pertence à matriz deste tipo de exceção.");
  }

  const responsibilities = await context.supabase
    .from("operational_responsibilities")
    .select("project_id")
    .eq("organization_id", context.organizationId)
    .eq("user_id", context.userId)
    .eq("persona_id", persona.id)
    .eq("active", true);
  if (responsibilities.error) failDatabase("operations.exception.responsibility", responsibilities.error, "excecoes");

  const allowedByScope = (responsibilities.data ?? []).some(item =>
    item.project_id === null ? true : item.project_id === projectId
  );
  if (!allowedByScope || (!projectId && !(responsibilities.data ?? []).some(item => item.project_id === null))) {
    failExceptions("Você não possui responsabilidade ativa para registrar esta exceção no escopo informado.");
  }

  if (projectId) {
    const project = await context.supabase
      .from("projects")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("id", projectId)
      .maybeSingle();
    if (project.error) failDatabase("operations.exception.project", project.error, "excecoes");
    if (!project.data) failExceptions("A obra selecionada não está disponível no seu escopo.");
  }

  const { error } = await context.supabase.rpc("create_operational_event", {
    p_organization_id: context.organizationId,
    p_project_id: projectId,
    p_event_code: eventCode,
    p_module_key: moduleKey,
    p_object_type: null,
    p_object_id: null,
    p_title: title,
    p_impact: impact,
    p_obligation_persona: obligationPersona,
    p_occurred_at: new Date().toISOString(),
    p_response_due_at: due,
    p_client_approved: clientApproved,
    p_evidence: evidenceText ? { note: evidenceText } : {},
    p_deduplication_key: `ui:${context.userId}:${deduplicationKey}`
  });
  if (error) failDatabase("operations.exception.create", error, "excecoes");

  revalidatePath("/app");
  revalidatePath(ROTA_EXCECOES);
  redirect(`${ROTA_EXCECOES}?ok=1`);
}
