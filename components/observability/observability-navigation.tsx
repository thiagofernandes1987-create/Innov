import Link from"next/link";

const ITEMS=[
 {href:"/app/auditoria",label:"Visão geral",detail:"Risco e atividade"},
 {href:"/app/auditoria/eventos",label:"Eventos",detail:"Fluxo correlacionado"},
 {href:"/app/auditoria/alertas",label:"Alertas",detail:"Reconhecimento e resolução"},
 {href:"/app/auditoria/saude",label:"Saúde",detail:"Serviços e diagnósticos"},
 {href:"/app/auditoria/configuracao",label:"Configuração",detail:"Regras e retenção"}
];

export function ObservabilityNavigation(){return <nav className="observability-navigation" aria-label="Auditoria e observabilidade">{ITEMS.map(item=><Link href={item.href} key={item.href}><strong>{item.label}</strong><small>{item.detail}</small></Link>)}</nav>;}
