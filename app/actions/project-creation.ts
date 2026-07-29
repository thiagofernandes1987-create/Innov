"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/auth";
import { reportDataAccessError } from "@/lib/errors/data-access";
import type { ProjectCreationState } from "@/lib/forms/project-creation-state";
import {
  classifyProjectCreationProviderError,
  validateContractProject
} from "@/lib/projects/project-creation";

const MANAGEMENT_ROLES = [
  "SUPER_ADMIN",
  "DIRECAO",
  "ADMINISTRADOR",
  "GESTOR_OBRAS",
  "ENGENHEIRO"
] as const;

export async function createProjectFromContractSafe(
  _previousState: ProjectCreationState,
  formData: FormData
): Promise<ProjectCreationState> {
  const { supabase } = await requireOrganizationContext(MANAGEMENT_ROLES);
  const validation = validateContractProject(formData);
  if (!validation.ok) return validation.state;

  const input = validation.value;
  const { data, error } = await supabase.rpc("create_project_from_contract_v2", {
    p_contract_id: input.contractId,
    p_code: input.code,
    p_name: input.name,
    p_planned_start: input.plannedStart,
    p_planned_end: input.plannedEnd,
    p_address_line: input.addressLine,
    p_district: input.district,
    p_city: input.city,
    p_state: input.state,
    p_postal_code: input.postalCode
  });

  if (error || !data) {
    reportDataAccessError("create-project-from-contract.rpc", error);
    return classifyProjectCreationProviderError(
      error,
      "Não foi possível converter o contrato em obra. Os dados preenchidos foram preservados para uma nova tentativa."
    );
  }

  revalidatePath("/app/obras");
  revalidatePath("/app/planejamento");
  redirect(`/app/obras/${data}`);
}
