import{runHealthSnapshot}from"@/app/actions/observability";
import{ObservabilityNavigation}from"@/components/observability/observability-navigation";
import{dateTime,healthLabel,severityLabel}from"@/lib/observability/domain";
import{loadObservabilityHealth}from"@/lib/observability/server";

export const dynamic="force-dynamic";

export default async function ObservabilityHealth({searchParams}:{searchParams:Promise<{error?:string}>}){
 const query=await searchParams;const{checks,diagnostics,error}=await loadObservabilityHealth();
 return <main className="content observability-app"><section className="page-heading"><div><span className="badge">AUDITORIA · SAÚDE</span><h1>Saúde da plataforma</h1><p>Estado dos workers, integrações, SLAs e diagnósticos técnicos do banco.</p></div><form action={runHealthSnapshot}><button className="button button-primary">Executar agora</button></form></section><ObservabilityNavigation/>{(query.error||error)&&<div className="validation blocking">{query.error||error}</div>}
 <section className="observability-health-grid">{checks.map(check=><article className="card card-pad" key={check.id}><header><span className={`health health-${check.status.toLowerCase()}`}>{healthLabel(check.status)}</span><time>{dateTime(check.checked_at)}</time></header><h2>{check.component}</h2><strong>{check.check_key}</strong><p>{check.message}</p></article>)}{!checks.length&&<div className="card card-pad empty-state"><h3>Nenhum snapshot</h3><p>Execute o diagnóstico para avaliar os componentes.</p></div>}</section>
 <section className="card card-pad"><div className="section-heading"><div><span className="eyebrow">ADVISORS E LEDGER</span><h2>Diagnósticos pendentes</h2></div></div><div className="observability-table-wrap"><table className="data-table"><thead><tr><th>Severidade</th><th>Tipo</th><th>Objeto</th><th>Código</th><th>Mensagem</th><th>Detectado</th></tr></thead><tbody>{diagnostics.map(item=><tr key={item.id}><td><span className={`severity severity-${item.severity.toLowerCase()}`}>{severityLabel(item.severity)}</span></td><td>{item.diagnostic_type}</td><td>{item.object_schema}.{item.object_name}</td><td>{item.code}</td><td>{item.message}</td><td>{dateTime(item.detected_at)}</td></tr>)}</tbody></table>{!diagnostics.length&&<div className="empty-state"><h3>Nenhum diagnóstico pendente</h3><p>As verificações atuais não registraram dívida técnica aberta.</p></div>}</div></section></main>;
}
