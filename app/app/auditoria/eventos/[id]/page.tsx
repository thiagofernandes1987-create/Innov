import Link from"next/link";
import{ObservabilityNavigation}from"@/components/observability/observability-navigation";
import{dateTime,text}from"@/lib/observability/domain";
import{loadObservabilityEvent}from"@/lib/observability/server";

export const dynamic="force-dynamic";

export default async function ObservabilityEventDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{origin?:string}>}){
 const[{id},query]=await Promise.all([params,searchParams]);const origin=query.origin||"audit_events";const{event,error}=await loadObservabilityEvent(origin,id);
 return <main className="content observability-app"><section className="page-heading"><div><span className="badge">AUDITORIA · DETALHE</span><h1>{text(event.event_type,"Evento")}</h1><p>Origem {origin} · identificador {id}</p></div><Link className="button button-secondary" href="/app/auditoria/eventos">Voltar aos eventos</Link></section><ObservabilityNavigation/>{error&&<div className="validation blocking">{error}</div>}
 <div className="observability-columns"><section className="card card-pad"><span className="eyebrow">IDENTIFICAÇÃO</span><dl className="detail-list"><div><dt>Evento</dt><dd>{text(event.event_type,text(event.eventType,"—"))}</dd></div><div><dt>Módulo</dt><dd>{text(event.module_key,text(event.moduleKey,"—"))}</dd></div><div><dt>Data</dt><dd>{dateTime(event.occurred_at??event.occurredAt)}</dd></div><div><dt>Recurso</dt><dd>{text(event.resource_type,"—")} {text(event.resource_id,"—")}</dd></div><div><dt>Correlação</dt><dd>{text(event.correlation_id,"—")}</dd></div></dl></section><section className="card card-pad"><span className="eyebrow">CONTEÚDO SANITIZADO</span><p className="muted">Chaves sensíveis são removidas ou substituídas por <code>[REDACTED]</code> no banco.</p><pre className="observability-json">{JSON.stringify(event,null,2)}</pre></section></div></main>;
}
