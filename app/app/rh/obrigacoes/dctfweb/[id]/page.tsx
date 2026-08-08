import Link from "next/link";
import { notFound } from "next/navigation";
import { recordDctfwebExternalSnapshot, upsertDctfwebReconciliation } from "@/app/actions/rh-government";
import { requireCapability } from "@/lib/authorization";
import { formatMoney } from "@/lib/financial/cash-flow";

export const dynamic = "force-dynamic";

export default async function DctfwebDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const context = await requireCapability("rh", "read");
  const [{ data: declaration, error }, { data: items }, { data: docs }] = await Promise.all([
    context.supabase.from("rh_dctfweb_declarations").select("*").eq("organization_id", context.organizationId).eq("id", id).maybeSingle(),
    context.supabase.from("rh_dctfweb_reconciliation_items").select("id,dimension,reference_key,internal_amount,external_amount,difference,status,cause,action_required,evidence_reference,updated_at").eq("organization_id", context.organizationId).eq("declaration_id", id).order("dimension"),
    context.supabase.from("rh_dctfweb_documents").select("id,document_type,external_id,amount,due_date,status,evidence_reference,created_at").eq("organization_id", context.organizationId).eq("declaration_id", id).order("created_at", { ascending: false })
  ]);
  if (error) throw new Error(error.message);
  if (!declaration) notFound();
  const divergent = (items ?? []).filter(item => item.status === "DIVERGENT").length;

  return <main className="content">
    <section className="page-heading"><div><span className="badge">DCTFWEB · {String(declaration.reference_month).slice(0,7)}</span><h1>Declaração e reconciliação</h1><p>{declaration.declaration_type} · {declaration.category}</p></div><div className="page-actions"><Link className="button button-secondary" href="/app/rh/obrigacoes/dctfweb">Voltar</Link><span className="badge">{declaration.status}</span></div></section>
    {query.error ? <div className="validation blocking">{query.error}</div> : null}
    {query.success ? <div className="alert alert-success">{query.success}</div> : null}

    <section className="stats-grid">
      <article className="card"><small>DÉBITO TOTAL</small><strong>{declaration.total_debt != null ? formatMoney(Number(declaration.total_debt)) : "—"}</strong><span>snapshot externo</span></article>
      <article className="card"><small>PAGO</small><strong>{formatMoney(Number(declaration.total_paid ?? 0))}</strong><span>registro conciliado</span></article>
      <article className="card"><small>DIVERGÊNCIAS</small><strong>{divergent}</strong><span>itens em investigação</span></article>
      <article className="card"><small>RECIBO</small><strong>{declaration.receipt_number ? "OK" : "—"}</strong><span>{declaration.receipt_number ?? "não registrado"}</span></article>
    </section>

    <section className="card card-pad"><div className="section-heading"><div><span className="eyebrow">SNAPSHOT EXTERNO</span><h2>Registrar consulta/transmissão oficial</h2></div></div>
      <form action={recordDctfwebExternalSnapshot} className="relationship-form">
        <input type="hidden" name="declarationId" value={declaration.id} />
        <div className="form-grid">
          <label><span>ID externo</span><input name="externalDeclarationId" defaultValue={declaration.external_declaration_id ?? ""} /></label>
          <label><span>Recibo</span><input name="receiptNumber" defaultValue={declaration.receipt_number ?? ""} /></label>
          <label><span>Contribuições sociais</span><input name="totalSocialSecurity" inputMode="decimal" defaultValue={declaration.total_social_security ?? ""} /></label>
          <label><span>Outros débitos</span><input name="totalOtherDebts" inputMode="decimal" defaultValue={declaration.total_other_debts ?? ""} /></label>
          <label><span>Total débito</span><input name="totalDebt" inputMode="decimal" defaultValue={declaration.total_debt ?? ""} /></label>
          <label><span>Total pago</span><input name="totalPaid" inputMode="decimal" defaultValue={declaration.total_paid ?? 0} /></label>
          <label><span>Status</span><select name="status" defaultValue={declaration.status}><option value="AVAILABLE">Disponível</option><option value="RECONCILING">Reconciliando</option><option value="READY_TO_TRANSMIT">Pronta para transmitir</option><option value="TRANSMITTED">Transmitida</option><option value="RECTIFICATION_REQUIRED">Retificação necessária</option><option value="RECONCILED">Reconciliada</option></select></label>
          <label><span>Fonte/evidência</span><input name="sourceReference" defaultValue={declaration.source_reference ?? ""} /></label>
        </div>
        <div className="form-actions"><button className="button button-primary" type="submit">Salvar snapshot oficial</button></div>
      </form>
    </section>

    <section className="card card-pad"><div className="section-heading"><div><span className="eyebrow">RECONCILIAÇÃO</span><h2>Folha/eSocial × DCTFWeb</h2></div></div>
      <form action={upsertDctfwebReconciliation} className="relationship-form">
        <input type="hidden" name="declarationId" value={declaration.id} />
        <div className="form-grid">
          <label><span>Dimensão *</span><select name="dimension" defaultValue="CONTRIBUTION"><option value="CONTRIBUTION">Contribuição</option><option value="WORKER">Trabalhador</option><option value="ESTABLISHMENT">Estabelecimento</option><option value="DEBT">Débito</option><option value="DARF">DARF</option></select></label>
          <label><span>Chave *</span><input name="referenceKey" required placeholder="CP_SEGURADO, estabelecimento, débito..." /></label>
          <label><span>Valor interno</span><input name="internalAmount" inputMode="decimal" defaultValue="0" /></label>
          <label><span>Valor externo</span><input name="externalAmount" inputMode="decimal" defaultValue="0" /></label>
          <label><span>Status</span><select name="status" defaultValue=""><option value="">Calcular</option><option value="MATCH">Correspondente</option><option value="DIVERGENT">Divergente</option><option value="JUSTIFIED">Justificado</option><option value="RESOLVED">Resolvido</option></select></label>
          <label><span>Causa</span><input name="cause" /></label>
          <label><span>Ação necessária</span><input name="actionRequired" /></label>
          <label><span>Evidência</span><input name="evidenceReference" /></label>
        </div>
        <div className="form-actions"><button className="button button-secondary" type="submit">Adicionar/atualizar item</button></div>
      </form>
    </section>

    <section className="card" style={{ overflowX: "auto" }}><table className="data-table"><thead><tr><th>Dimensão</th><th>Chave</th><th>Interno</th><th>Externo</th><th>Diferença</th><th>Status</th><th>Ação</th></tr></thead><tbody>
      {(items ?? []).map(item => <tr key={item.id}><td>{item.dimension}</td><td>{item.reference_key}</td><td>{formatMoney(Number(item.internal_amount))}</td><td>{formatMoney(Number(item.external_amount))}</td><td>{formatMoney(Number(item.difference))}</td><td><span className="badge">{item.status}</span></td><td><small>{item.action_required ?? item.cause ?? "—"}</small></td></tr>)}
      {!items?.length ? <tr><td colSpan={7}><div className="empty-state"><p>Nenhum item reconciliado.</p></div></td></tr> : null}
    </tbody></table></section>

    <section className="card card-pad"><span className="eyebrow">CANAL OFICIAL</span><h2>Automação condicionada à capability</h2><p>Quando Integra Contador estiver contratado e autorizado, consultas/transmissões formalmente expostas poderão alimentar este workspace. Sem capability, a tarefa permanece assistida no e-CAC com evidência registrada — nunca scraping oculto.</p><p>Documentos registrados: {docs?.length ?? 0}.</p></section>
  </main>;
}
