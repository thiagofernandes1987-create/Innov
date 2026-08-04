import type { ReactNode } from "react";
import { createNextBudgetVersion } from "@/app/actions/budget-versions";
import { requireOrganizationContext } from "@/lib/auth";

type BudgetLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function BudgetLayout({ children, params }: BudgetLayoutProps) {
  const { id } = await params;
  const { supabase, organizationId, role } = await requireOrganizationContext();
  const canCreateVersion = [
    "SUPER_ADMIN",
    "DIRECAO",
    "ADMINISTRADOR",
    "ORCAMENTISTA",
    "FINANCEIRO"
  ].includes(role);

  const { data: budget } = await supabase
    .from("budgets")
    .select("id, code, current_version_id, budget_versions!budgets_current_version_fk(version_number, frozen_at)")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const relation = budget?.budget_versions as
    | { version_number?: number; frozen_at?: string | null }
    | Array<{ version_number?: number; frozen_at?: string | null }>
    | null
    | undefined;
  const version = Array.isArray(relation) ? relation[0] : relation;
  const frozen = Boolean(version?.frozen_at);

  return (
    <>
      {frozen && canCreateVersion ? (
        <section className="content" style={{ paddingBottom: 0 }}>
          <div className="validation" role="status" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <strong>{budget?.code ?? "Orçamento"} · V{version?.version_number ?? "—"} está congelada</strong>
              <div>O histórico será preservado. Continue materiais, mão de obra, metragem, custos fixos, impostos e margem em uma nova versão editável.</div>
            </div>
            <form action={createNextBudgetVersion}>
              <input type="hidden" name="budgetId" value={id} />
              <input type="hidden" name="changeSummary" value="Continuidade da composição em nova versão" />
              <button className="button button-primary" type="submit">Criar nova versão editável</button>
            </form>
          </div>
        </section>
      ) : null}
      {children}
    </>
  );
}
