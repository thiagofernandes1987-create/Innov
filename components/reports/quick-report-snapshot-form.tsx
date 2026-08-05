"use client";

import { useActionState } from "react";
import { generateReportSnapshot } from "@/app/actions/reports";
import { INITIAL_REPORT_ACTION_STATE } from "@/lib/forms/report-action-state";

export function QuickReportSnapshotForm({
  projectId,
  periodStart,
  periodEnd,
  kind
}: {
  projectId: string | null;
  periodStart: string;
  periodEnd: string;
  kind: "PROJECT" | "EXECUTIVE";
}) {
  const [state, action, pending] = useActionState(generateReportSnapshot, INITIAL_REPORT_ACTION_STATE);

  return (
    <div className="quick-report-snapshot">
      <form action={action}>
        <input type="hidden" name="projectId" value={projectId ?? ""} />
        <input type="hidden" name="periodStart" value={periodStart} />
        <input type="hidden" name="periodEnd" value={periodEnd} />
        <input type="hidden" name="kind" value={kind} />
        <button className="button button-primary" disabled={pending}>
          {pending ? "Criando…" : "Criar snapshot"}
        </button>
      </form>
      {state.message ? <div className="validation blocking" role="alert">{state.message}</div> : null}
    </div>
  );
}
