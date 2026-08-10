import{mensagemDeFalha}from"@/lib/errors/data-access";
import Link from "next/link";
import { createFgtsPeriodFromPayroll } from "@/app/actions/rh-government";
import { requireCapability } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function FgtsDigitalPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const context = await requireCapability("rh", "read");
  const query = await searchParams;
  const [{ data: periods, error }, { data: payrollPeriods }, { data: bases }, { data: rubrics }] = await Promise.all([
    context.supabase.from("rh_fgts_periods").select("id,reference_month,period_type,status,esocial_source_status,external_reference,created_at,rh_fgts_worker_reconciliations(id,status),rh_fgts_guides(id,status,total_amount)").eq("organization_id", context.organizationId).order("reference_month", { ascending: false }),
    context.supabase.from("rh_payroll_periods").select("id,reference_month,processing_type,status,rh_payroll_runs(id,status,run_number)").eq("organization_id", context.organizationId).in("status", ["CALCULATED", "CLOSED"]).order("reference_month", { ascending: false }),
    context.supabase.from("rh_payroll_base_definitions").select("code,name").eq("organization_id", context.organizationId).order("code"),
    context.supabase.from("rh_rubrics").select("code,name,payroll_kind").eq("organization_id", context.organizationId).eq("active", true).order("code")
  ]);
  if (error) throw new Error(mensagemDeFalha("app.rh.obrigacoes.fgts-digital.FgtsDigitalPage", error));

  return <main className="content">
    <section className="page-heading"><div><span className="badge">OBRIGAÇÕES · FGTS DIGITAL</span><h1>FGTS Digital</h1><p>Conferência por trabalhador, guia, pagamento e conciliação sem presumir API geral inexistente.</p></div></section>
    {query.error ? <div className="validation blocking">{query.error}</div> : null}
    {query.success ? <div className="alert alert-success">{query.success}</div> : null}

    <section className="card card-pad"><div className="section-heading"><div><span className="eyebrow">NOVA RECONCILIAÇÃO</span><h2>Projetar da folha calculada</h2></div></div>
      <form action={createFgtsPeriodFromPayroll} className="relationship-form"><div className="form-grid">
        <label><span>Competência da folha *</span><select name="payrollPeriodId" required defaultValue=""><option value="" disabled>Selecione</option>{(payrollPeriods ?? []).map(period => <option value={period.id} key={period.id}>{String(period.reference_month).slice(0,7)} · {period.processing_type} · {period.status}</option>)}</select></label>
        <label><span>Tipo FGTS</span><select name="periodType" defaultValue="MONTHLY"><option value="MONTHLY">Mensal</option><option value="TERMINATION">Rescisório</option><option value="RETROACTIVE">Retroativo</option><option value="LABOR_CLAIM">Processo trabalhista</option></select></label>
        <label><span>Base configurada *</span><select name="baseCode" required defaultValue=""><option value="" disabled>Selecione</option>{(bases ?? []).map(base => <option value={base.code} key={base.code}>{base.code} · {base.name}</option>)}</select></label>
        <label><span>Rubrica do valor esperado *</span><select name="amountRubricCode" required defaultValue=""><option value="" disabled>Selecione</option>{(rubrics ?? []).map(rubric => <option value={rubric.code} key={rubric.code}>{rubric.code} · {rubric.name} · {rubric.payroll_kind}</option>)}</select></label>
      </div><div className="validation"><strong>Sem alíquota fixa no código:</strong> a base e o valor esperado vêm do resultado parametrizado da folha. O workspace apenas projeta e reconcilia esses valores com o FGTS Digital.</div><div className="form-actions"><button className="button button-primary" type="submit">Criar reconciliação FGTS</button></div></form>
    </section>

    <section className="card" style={{ overflowX: "auto" }}><div className="section-heading card-pad"><div><span className="eyebrow">COMPETÊNCIAS</span><h2>Acompanhamento</h2></div></div><table className="data-table"><thead><tr><th>Competência</th><th>Tipo</th><th>Trabalhadores</th><th>Guia</th><th>Fonte eSocial</th><th>Status</th></tr></thead><tbody>
      {(periods ?? []).map(period => {
        const workers = Array.isArray(period.rh_fgts_worker_reconciliations) ? period.rh_fgts_worker_reconciliations : [];
        const guides = Array.isArray(period.rh_fgts_guides) ? period.rh_fgts_guides : [];
        return <tr key={period.id}><td><Link className="text-link" href={`/app/rh/obrigacoes/fgts-digital/${period.id}`}><strong>{String(period.reference_month).slice(0,7)}</strong></Link></td><td>{period.period_type}</td><td>{workers.length}</td><td>{guides.length ? guides.map(g => g.status).join(", ") : "—"}</td><td>{period.esocial_source_status ?? "—"}</td><td><span className="badge">{period.status}</span></td></tr>;
      })}
      {!periods?.length ? <tr><td colSpan={6}><div className="empty-state"><h3>Nenhuma reconciliação</h3><p>Projete uma competência calculada da folha.</p></div></td></tr> : null}
    </tbody></table></section>

    <section className="card card-pad"><span className="eyebrow">CANAL</span><h2>Integração híbrida, não fictícia</h2><p>Remunerações são alimentadas governamentalmente a partir do eSocial. Quando o fluxo oficial exigir arquivo, será usado o leiaute oficial versionado. Emissão/gestão de guia permanece `PORTAL_ASSISTED` até existir capability oficial documentada para a organização.</p></section>
  </main>;
}
