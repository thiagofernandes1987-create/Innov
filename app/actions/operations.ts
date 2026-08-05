"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccessAdministration } from "@/lib/authorization";
import { PERSONAS_OPERACIONAIS, type PersonaId } from "@/lib/personas/runtime";

const PERSONA_IDS = new Set(PERSONAS_OPERACIONAIS.map(persona => persona.id));
const ROTA = "/app/administracao/responsabilidades";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function fail(message: string): never {
  redirect(`${ROTA}?error=${encodeURIComponent(message)}`);
}

function validTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
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
  if (membership.error || !membership.data) fail("Usuário não é membro ativo desta organização.");
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
  if (existing.error) fail(existing.error.message);

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

  if (result.error) fail(result.error.message);
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
  if (error) fail(error.message);
  revalidatePath(ROTA);
}
