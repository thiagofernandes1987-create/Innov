import Link from "next/link";
import { notFound } from "next/navigation";
import { createFgtsGuide, recordFgtsPayment, updateFgtsWorkerExternal } from "@/app/actions/rh-government";
import { requireCapability } from "@/lib/authorization";
import { formatMoney } from "@/lib/financial/cash-flow";

export const dynamic = "force-dynamic";
function one<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }

export default async function FgtsDigitalDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const context = await requireCapability("rh", "read");
  const [{ data: period, error }, { data: items }, { data: guides }, { data: payments }] = await Promise.all([
    context.supabase.from("rh_fgts_periods").select("*").eq("organization_id", context.organizationId).eq("id", id).maybeSingle(),
    context.supabase.from("rh_fgts_worker_reconciliations").select("id,employment_id,expected_base,expected_amount,external_base,external_amount,base_difference,amount_difference,status,cause,action_required,evidence_reference,rh_employments(registration_number,rh_workers(worker_code,rh_people(full_name,preferred_name)))").eq("organization_id", context.organizationId).eq("fgts_period_id", id).order("status"),
    context.supabase.from("rh_fgts_guides").select("id,external_guide_id,guide_type,channel_type,due_date,principal_amount,additions_amount,total_amount,status,evidence_reference,created_at").eq("organization_id", context.organizationId).eq("fgts_period_id", id).order("created_at", { ascending: false }),
    context.supabase.from("rh_fgts_payments").select("id,guide_id,amount,paid_at,payment_channel,external_payment_id,evidence_reference,status").eq("organization_id", context.organizationId).order("paid_at", { ascending: false })
  ]);
  if (error) throw new Error(error.message);
  if (!period) notFound();
  const periodGuideIds = new Set((guides ?? []).map(guide => guide.id));
  const periodPayments = (payments ?? []).filter(payment => periodGuideIds.has(payment.guide_id));
  const divergent = (items ?? []).filter(item => item.status === "DIVERGENT").length;
  const expected = (items ?? []).reduce((sum, item) => sum + Number(item.expected_amount ?? 0), 0);
  const external = (items ?? []).reduce((sum, item) => sum + Number(item.external_amount ?? 0), 0);

  return <main className="content">
    <section className="page-heading"><div><span className="badge">FGTS DIGITAL · {String(period.reference_month).slice(0,7)}</span><h1>Reconciliação por trabalhador</h1><p>{period.period_type} · origem {period.esocial_source_status ?? "não confirmada"}</p></div><div className="page-actions"><Link className="button button-secondary" href="/app/rh/obrigacoes/fgts-digital">Voltar</Link><span className="badge">{period.status}</span></div></section>
    {query.error ? <div className="validation blocking">{query.error}</div> : null}
    {query.success ? <div className="alert alert-success">{query.success}</div> : null}

    <section className="stats-grid"><article className="card"><small>ESPERADO</small><strong>{formatMoney(expected)}</strong><span>folha parametrizada</span></article><article className="card"><small>EXTERNO</small><strong>{formatMoney(external)}</strong><span>FGTS Digital registrado</span></article><article className="card"><small>DIVERGÊNCIAS</small><strong>{divergent}</strong><span>trabalhadores</span></article><article className="card"><small>PAGAMENTOS</small><strong>{periodPayments.length}</strong><span>evidências registradas</span></article></section>

    <section className="card" style={{ overflowX: "auto" }}><div className="section-heading card-pad"><div><span className="eyebrow">TRABALHADORES</span><h2>Conferência individualizada</h2></div></div><table className="data-table"><thead><tr><th>Trabalhador</th><th>Base esperada</th><th>FGTS esperado</th><th>Base externa</th><th>FGTS externo</th><th>Diferença</th><th>Status</th></tr></thead><tbody>
      {(items ?? []).map(item => {
        const employment = one(item.rh_employments);
        const worker = employment ? one(employment.rh_workers) : null;
        const person = worker ? one(worker.rh_people) : null;
        return <tr key={item.id}><td><strong>{person?.preferred_name ?? person?.full_name ?? worker?.worker_code ?? employment?.registration_number}</strong><small style={{ display: "block" }}>{employment?.registration_number}</small></td><td>{formatMoney(Number(item.expected_base))}</td><td>{formatMoney(Number(item.expected_amount))}</td><td colSpan={3}><form action={updateFgtsWorkerExternal} className="relationship-form"><input type="hidden" name="periodId" value={period.id} /><input type="hidden" name="itemId" value={item.id} /><div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><input name="externalBase" inputMode="decimal" defaultValue={item.external_base ?? ""} placeholder="Base externa" /><input name="externalAmount" inputMode="decimal" defaultValue={item.external_amount ?? ""} placeholder="Valor externo" /><input name="evidenceReference" defaultValue={item.evidence_reference ?? ""} placeholder="Evidência" /><button className="button button-secondary" type="submit">Reconciliar</button></div></form><small>Δ base {formatMoney(Number(item.base_difference ?? 0))} · Δ valor {formatMoney(Number(item.amount_difference ?? 0))}</small></td><td><span className="badge">{item.status}</span></td></tr>;
      })}
    </tbody></table></section>

    <section className="card card-pad"><div className="section-heading"><div><span className="eyebrow">GUIA</span><h2>Registrar emissão pelo canal oficial</h2></div></div><form action={createFgtsGuide} className="relationship-form"><input type="hidden" name="periodId" value={period.id} /><div className="form-grid"><label><span>Canal *</span><select name="channelType" defaultValue="PORTAL_ASSISTED"><option value="PORTAL_ASSISTED">Portal assistido</option><option value="OFFICIAL_FILE_IMPORT">Arquivo oficial</option><option value="DIRECT_API">API — somente se capability existir</option></select></label><label><span>ID da guia</span><input name="externalGuideId" /></label><label><span>Vencimento</span><input name="dueDate" type="date" /></label><label><span>Principal</span><input name="principalAmount" inputMode="decimal" defaultValue={expected.toFixed(2)} /></label><label><span>Acréscimos</span><input name="additionsAmount" inputMode="decimal" defaultValue="0" /></label><label><span>Evidência/referência</span><input name="evidenceReference" /></label></div><div className="form-actions"><button className="button button-primary" type="submit">Registrar guia emitida</button></div></form></section>

    <section className="card" style={{ overflowX: "auto" }}><table className="data-table"><thead><tr><th>Guia</th><th>Canal</th><th>Vencimento</th><th>Total</th><th>Status</th><th>Pagamento</th></tr></thead><tbody>{(guides ?? []).map(guide => {
      const guidePayments = periodPayments.filter(payment => payment.guide_id === guide.id);
      return <tr key={guide.id}><td>{guide.external_guide_id ?? guide.id.slice(0, 8)}</td><td>{guide.channel_type}</td><td>{guide.due_date ?? "—"}</td><td>{formatMoney(Number(guide.total_amount))}</td><td><span className="badge">{guide.status}</span></td><td><form action={recordFgtsPayment} className="relationship-form"><input type="hidden" name="periodId" value={period.id} /><input type="hidden" name="guideId" value={guide.id} /><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input name="amount" inputMode="decimal" placeholder="Valor" /><input name="paidAt" type="datetime-local" /><input name="evidenceReference" placeholder="Comprovante/evidência" /><input name="externalPaymentId" placeholder="ID externo" /><button className="button button-secondary" type="submit">Registrar pagamento</button></div></form><small>{guidePayments.length} pagamento(s) registrado(s)</small></td></tr>;
    })}{!guides?.length ? <tr><td colSpan={6}><div className="empty-state"><p>Nenhuma guia registrada.</p></div></td></tr> : null}</tbody></table></section>

    <section className="card card-pad"><div className="validation"><strong>Não confundir canal:</strong> `DIRECT_API` só deve ser usado quando uma API oficial aplicável estiver documentada e habilitada para a organização. Na ausência disso, a emissão é registrada como portal assistido ou arquivo oficial, com evidência e reconciliação posterior.</div></section>
  </main>;
}
