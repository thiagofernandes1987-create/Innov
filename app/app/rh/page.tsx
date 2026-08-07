import Link from"next/link";
import{requireCapability}from"@/lib/authorization";
import{formatMoney}from"@/lib/financial/cash-flow";

export const dynamic="force-dynamic";

export default async function RhDashboard(){
  const context=await requireCapability("rh","read");
  const[{count:activeWorkers},{count:openPeriods},{data:lastRun},{count:openInputs}]=await Promise.all([
    context.supabase.from("rh_employments").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId).eq("status","ACTIVE"),
    context.supabase.from("rh_payroll_periods").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId).in("status",["OPEN","CALCULATED","REVIEW","REOPENED"]),
    context.supabase.from("rh_payroll_runs").select("net_total,gross_total,deduction_total,completed_at,rh_payroll_periods(reference_month,processing_type)").eq("organization_id",context.organizationId).eq("status","COMPLETED").order("completed_at",{ascending:false}).limit(1).maybeSingle(),
    context.supabase.from("rh_payroll_inputs").select("id",{count:"exact",head:true}).eq("organization_id",context.organizationId)
  ]);
  const period=lastRun?.rh_payroll_periods?(Array.isArray(lastRun.rh_payroll_periods)?lastRun.rh_payroll_periods[0]:lastRun.rh_payroll_periods):null;
  return <main className="content"><section className="page-heading"><div><span className="badge">APLICATIVO · RH/DP</span><h1>Recursos Humanos e Departamento Pessoal</h1><p>Cadastro de empregados, folha e obrigações digitais dentro da mesma trilha operacional.</p></div><div className="page-actions"><Link className="button button-secondary" href="/app/rh/pessoas/novo">Novo empregado</Link><Link className="button button-primary" href="/app/rh/folha/competencias/nova">Abrir competência</Link></div></section>
  <section className="stats-grid"><article className="card"><small>EMPREGADOS ATIVOS</small><strong>{activeWorkers??0}</strong><span>vínculos ativos</span></article><article className="card"><small>COMPETÊNCIAS ABERTAS</small><strong>{openPeriods??0}</strong><span>folhas em trabalho</span></article><article className="card"><small>LANÇAMENTOS</small><strong>{openInputs??0}</strong><span>fatos de folha registrados</span></article><article className="card"><small>ÚLTIMA FOLHA LÍQUIDA</small><strong>{formatMoney(Number(lastRun?.net_total??0))}</strong><span>{period?`${String(period.reference_month).slice(0,7)} · ${period.processing_type}`:"nenhum cálculo"}</span></article></section>
  <section className="finance-launch-grid"><Link className="card card-pad finance-launch" href="/app/rh/pessoas"><span>♟</span><div><h2>Pessoas e vínculos</h2><p>Cadastro, salário base, matrícula e situação do vínculo.</p></div></Link><Link className="card card-pad finance-launch" href="/app/rh/folha"><span>∑</span><div><h2>Folha de pagamento</h2><p>Rubricas, competências, lançamentos, cálculo e fechamento.</p></div></Link><Link className="card card-pad finance-launch" href="/app/rh/obrigacoes"><span>↗</span><div><h2>Obrigações digitais</h2><p>eSocial, DCTFWeb e FGTS Digital por canal oficial aplicável.</p></div></Link></section>
  <section className="card card-pad"><div className="section-heading"><div><span className="eyebrow">ESTADO DA IMPLEMENTAÇÃO</span><h2>Primeira vertical funcional</h2></div></div><p>Esta versão já implementa o núcleo persistente de empregado e uma Folha V1 determinística. Admissão completa, ponto, SST e adapters governamentais continuam em desenvolvimento e não aparecem como concluídos.</p>{lastRun?<dl className="detail-list"><div><dt>Bruto da última execução</dt><dd>{formatMoney(Number(lastRun.gross_total))}</dd></div><div><dt>Descontos</dt><dd>{formatMoney(Number(lastRun.deduction_total))}</dd></div><div><dt>Líquido</dt><dd>{formatMoney(Number(lastRun.net_total))}</dd></div></dl>:null}</section></main>;
}
