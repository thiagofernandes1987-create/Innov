export type ProjectCreationField =
  | "entryMode"
  | "contractId"
  | "clientId"
  | "managerId"
  | "code"
  | "name"
  | "status"
  | "progressPercent"
  | "plannedStart"
  | "plannedEnd"
  | "actualStart"
  | "dataCutoff"
  | "historicalCost"
  | "importedFrom"
  | "state"
  | "postalCode";

export type ProjectCreationState = {
  status: "idle" | "error";
  message: string | null;
  fieldErrors: Partial<Record<ProjectCreationField, string>>;
  attempt: number;
};

export const INITIAL_PROJECT_CREATION_STATE: ProjectCreationState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  attempt: 0
};

export function projectCreationError(
  message: string,
  fieldErrors: ProjectCreationState["fieldErrors"] = {}
): ProjectCreationState {
  return {
    status: "error",
    message,
    fieldErrors,
    attempt: Date.now()
  };
}
