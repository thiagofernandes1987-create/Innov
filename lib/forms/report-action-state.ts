export type ReportActionField =
  | "id"
  | "name"
  | "kind"
  | "projectId"
  | "periodStart"
  | "periodEnd"
  | "visibleMetrics"
  | "description"
  | "metricKey"
  | "comparison"
  | "warningValue"
  | "criticalValue"
  | "savedViewId";

export type ReportActionState = {
  status: "idle" | "error";
  message: string | null;
  fieldErrors: Partial<Record<ReportActionField, string>>;
  values: Partial<Record<ReportActionField, string>>;
  attempt: number;
};

export const INITIAL_REPORT_ACTION_STATE: ReportActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: {},
  attempt: 0
};

export function reportActionError(
  message: string,
  values: ReportActionState["values"],
  fieldErrors: ReportActionState["fieldErrors"] = {}
): ReportActionState {
  return {
    status: "error",
    message,
    fieldErrors,
    values,
    attempt: Date.now()
  };
}
