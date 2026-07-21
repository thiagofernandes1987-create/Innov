export type CrmPipeline={
 leadsByStage:Record<string,number>;
 opportunitiesByStage:Record<string,{count:number;value:number}>;
 followUpsDue:number;
 weightedPipeline:number;
 wonValue:number;
};

export type SacDashboard={
 byStatus:Record<string,number>;
 open:number;
 overdue:number;
 waitingClient:number;
 averageSatisfaction:number|null;
 averageResolutionHours:number|null;
};

export type Client360={
 sensitiveVisible:boolean;
 client:Record<string,unknown>;
 contacts:Record<string,unknown>[];
 projects:Record<string,unknown>[];
 opportunities:Record<string,unknown>[];
 contracts:Record<string,unknown>[];
 tickets:Record<string,unknown>[];
 recentActivities:Record<string,unknown>[];
};

export type SacTicketDetail={
 internal:boolean;
 ticket:Record<string,unknown>;
 messages:Record<string,unknown>[];
 attachments:Record<string,unknown>[];
 events:Record<string,unknown>[];
};

function object(value:unknown):Record<string,unknown>{return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function number(value:unknown,fallback=0){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback;}
function nullableNumber(value:unknown){if(value===null||value===undefined||value==="")return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null;}
function array(value:unknown){return Array.isArray(value)?value.filter(item=>item&&typeof item==="object") as Record<string,unknown>[]:[];}
function numberMap(value:unknown){const source=object(value);return Object.fromEntries(Object.entries(source).map(([key,item])=>[key,number(item)]));}

export function normalizeCrmPipeline(value:unknown):CrmPipeline{
 const source=object(value);const opportunities=object(source.opportunitiesByStage);
 return{
  leadsByStage:numberMap(source.leadsByStage),
  opportunitiesByStage:Object.fromEntries(Object.entries(opportunities).map(([key,item])=>{const row=object(item);return[key,{count:number(row.count),value:number(row.value)}];})),
  followUpsDue:number(source.followUpsDue),weightedPipeline:number(source.weightedPipeline),wonValue:number(source.wonValue)
 };
}

export function normalizeSacDashboard(value:unknown):SacDashboard{const source=object(value);return{byStatus:numberMap(source.byStatus),open:number(source.open),overdue:number(source.overdue),waitingClient:number(source.waitingClient),averageSatisfaction:nullableNumber(source.averageSatisfaction),averageResolutionHours:nullableNumber(source.averageResolutionHours)};}

export function normalizeClient360(value:unknown):Client360{const source=object(value);return{sensitiveVisible:Boolean(source.sensitiveVisible),client:object(source.client),contacts:array(source.contacts),projects:array(source.projects),opportunities:array(source.opportunities),contracts:array(source.contracts),tickets:array(source.tickets),recentActivities:array(source.recentActivities)};}

export function normalizeSacTicketDetail(value:unknown):SacTicketDetail{const source=object(value);return{internal:Boolean(source.internal),ticket:object(source.ticket),messages:array(source.messages),attachments:array(source.attachments),events:array(source.events)};}

export function formatRelationshipCurrency(value:unknown){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:2}).format(number(value));}
export function formatRelationshipDate(value:unknown){if(!value)return"—";const date=new Date(String(value));return Number.isNaN(date.valueOf())?"—":new Intl.DateTimeFormat("pt-BR",{dateStyle:"short"}).format(date);}
export function formatRelationshipDateTime(value:unknown){if(!value)return"—";const date=new Date(String(value));return Number.isNaN(date.valueOf())?"—":new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(date);}
export function safeText(value:unknown,fallback="—"){const text=String(value??"").trim();return text||fallback;}

export const LEAD_STAGE_LABELS:Record<string,string>={NEW:"Novo",CONTACTED:"Contatado",QUALIFIED:"Qualificado",DISQUALIFIED:"Desqualificado",CONVERTED:"Convertido"};
export const OPPORTUNITY_STAGE_LABELS:Record<string,string>={PROSPECTING:"Prospecção",QUALIFIED:"Qualificada",PROPOSAL:"Proposta",NEGOTIATION:"Negociação",WON:"Ganha",LOST:"Perdida"};
export const TICKET_STATUS_LABELS:Record<string,string>={OPEN:"Aberto",TRIAGE:"Triagem",IN_PROGRESS:"Em atendimento",WAITING_CLIENT:"Aguardando cliente",WAITING_INTERNAL:"Aguardando equipe",RESOLVED:"Resolvido",CLOSED:"Fechado",CANCELLED:"Cancelado"};
export const TICKET_PRIORITY_LABELS:Record<string,string>={LOW:"Baixa",NORMAL:"Normal",HIGH:"Alta",URGENT:"Urgente"};
