"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireModulePermission } from "@/lib/auth";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function optional(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

export async function createClient(formData: FormData) {
  const context = await requireModulePermission("clientes", "EDIT");
  const { data, error } = await context.supabase.rpc("create_client_record", {
    p_organization_id: context.organizationId,
    p_type: text(formData, "type") || "PERSON",
    p_legal_name: text(formData, "legalName"),
    p_trade_name: optional(formData, "tradeName"),
    p_tax_id: optional(formData, "taxId"),
    p_email: optional(formData, "email"),
    p_phone: optional(formData, "phone"),
    p_address_line: optional(formData, "addressLine"),
    p_city: optional(formData, "city"),
    p_state: optional(formData, "state"),
    p_postal_code: optional(formData, "postalCode"),
    p_notes: optional(formData, "notes")
  });

  if (error || !data) {
    fail("/app/clientes/novo", error?.message ?? "Não foi possível cadastrar o cliente.");
  }

  redirect(`/app/clientes/${data}`);
}

export async function updateClient(formData: FormData) {
  const clientId = text(formData, "clientId");
  const context = await requireModulePermission("clientes", "EDIT");
  const { error } = await context.supabase.rpc("update_client_record", {
    p_client_id: clientId,
    p_legal_name: text(formData, "legalName"),
    p_trade_name: optional(formData, "tradeName"),
    p_tax_id: optional(formData, "taxId"),
    p_email: optional(formData, "email"),
    p_phone: optional(formData, "phone"),
    p_address_line: optional(formData, "addressLine"),
    p_city: optional(formData, "city"),
    p_state: optional(formData, "state"),
    p_postal_code: optional(formData, "postalCode"),
    p_notes: optional(formData, "notes"),
    p_status: text(formData, "status") || "ACTIVE"
  });

  if (error) fail(`/app/clientes/${clientId}`, error.message);
  revalidatePath("/app/clientes");
  revalidatePath(`/app/clientes/${clientId}`);
}

export async function createProjectForClient(formData: FormData) {
  const clientId = text(formData, "clientId");
  const context = await requireModulePermission("obras", "EDIT");
  const { data, error } = await context.supabase.rpc("create_project_for_client", {
    p_client_id: clientId,
    p_code: text(formData, "code"),
    p_name: text(formData, "name"),
    p_planned_start: optional(formData, "plannedStart"),
    p_planned_end: optional(formData, "plannedEnd"),
    p_contract_id: optional(formData, "contractId"),
    p_description: optional(formData, "description"),
    p_address_line: optional(formData, "addressLine"),
    p_city: optional(formData, "city"),
    p_state: optional(formData, "state"),
    p_postal_code: optional(formData, "postalCode")
  });

  if (error || !data) {
    fail(`/app/clientes/${clientId}/obras/nova`, error?.message ?? "Não foi possível criar a obra.");
  }

  redirect(`/app/obras/${data}`);
}

export async function setProjectLifecycleStatus(formData: FormData) {
  const projectId = text(formData, "projectId");
  const clientId = text(formData, "clientId");
  const context = await requireModulePermission("obras", "EDIT", { projectId });
  const { error } = await context.supabase.rpc("set_project_lifecycle_status", {
    p_project_id: projectId,
    p_status: text(formData, "status"),
    p_reason: optional(formData, "reason")
  });

  if (error) fail(`/app/clientes/${clientId}`, error.message);
  revalidatePath(`/app/clientes/${clientId}`);
  revalidatePath(`/app/obras/${projectId}`);
  revalidatePath("/app/obras");
}
