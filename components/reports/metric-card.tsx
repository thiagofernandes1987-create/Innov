import type{MetricHealth}from"@/lib/reports/metrics";

export function MetricCard({label,value,detail,health="NO_TARGET"}:{label:string;value:string;detail:string;health?:MetricHealth}){
 return <article className={`card report-metric report-health-${health.toLowerCase()}`}><small>{label}</small><strong>{value}</strong><span>{detail}</span></article>;
}
