export type ObservabilitySeverity="INFO"|"WARNING"|"ERROR"|"CRITICAL";
export type HealthStatus="HEALTHY"|"DEGRADED"|"UNHEALTHY"|"UNKNOWN";

export type ObservabilityEvent={
 id:string;organization_id:string;project_id:string|null;client_id:string|null;module_key:string|null;
 event_type:string;severity:ObservabilitySeverity;source:string;actor_user_id:string|null;actor_type:string;
 resource_type:string;resource_id:string|null;action:string;result:string;message:string|null;
 metadata:Record<string,unknown>;correlation_id:string;occurred_at:string;origin_table:string;
};

export type ObservabilityAlert={
 id:string;module_key:string|null;severity:ObservabilitySeverity;title:string;message:string;status:string;
 occurrence_count:number;first_occurred_at:string;last_occurred_at:string;correlation_id:string|null;
};

export type HealthCheck={id:string;check_key:string;component:string;status:HealthStatus;message:string;details:Record<string,unknown>;checked_at:string};
export type Diagnostic={id:string;diagnostic_type:string;severity:ObservabilitySeverity;object_schema:string;object_name:string;code:string;message:string;detected_at:string;resolved_at:string|null};

export function record(value:unknown):Record<string,unknown>{return value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
export function records(value:unknown):Record<string,unknown>[]{return Array.isArray(value)?value.filter(item=>item!==null&&typeof item==="object"&&!Array.isArray(item)) as Record<string,unknown>[]:[];}
export function text(value:unknown,fallback=""){return typeof value==="string"?value:fallback;}
export function number(value:unknown,fallback=0){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback;}
export function nullableText(value:unknown){return typeof value==="string"&&value?value:null;}

export function severityLabel(value:string){return({INFO:"Informação",WARNING:"Atenção",ERROR:"Erro",CRITICAL:"Crítico"}as Record<string,string>)[value]??value;}
export function healthLabel(value:string){return({HEALTHY:"Saudável",DEGRADED:"Degradado",UNHEALTHY:"Indisponível",UNKNOWN:"Desconhecido"}as Record<string,string>)[value]??value;}
export function dateTime(value:unknown){if(typeof value!=="string"||!value)return"—";const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"medium"}).format(date);}

export function parseDashboard(value:unknown){
 const root=record(value);const events=record(root.events);
 return{
  periodHours:number(root.periodHours,24),
  events:{total:number(events.total),info:number(events.info),warning:number(events.warning),error:number(events.error),critical:number(events.critical)},
  openAlerts:number(root.openAlerts),unhealthyChecks:number(root.unhealthyChecks),unresolvedDiagnostics:number(root.unresolvedDiagnostics),
  byModule:records(root.byModule),recentAlerts:records(root.recentAlerts),latestHealth:records(root.latestHealth)
 };
}

export function parseEvents(value:unknown){const root=record(value);return{items:records(root.items)as unknown as ObservabilityEvent[],total:number(root.total),page:number(root.page,1),pageSize:number(root.pageSize,50),pages:number(root.pages,1)};}
