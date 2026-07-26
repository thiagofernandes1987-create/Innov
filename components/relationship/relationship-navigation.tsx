import Link from"next/link";

const ITEMS=[
 {href:"/app/crm",label:"CRM",detail:"Funil comercial"},
 {href:"/app/crm/leads",label:"Leads",detail:"Prospecção e qualificação"},
 {href:"/app/crm/oportunidades",label:"Oportunidades",detail:"Negociação e fechamento"},
 {href:"/app/clientes",label:"Clientes",detail:"Cadastro 360 e multiobra"},
 {href:"/app/ocorrencias",label:"SAC",detail:"Atendimento e pós-venda"},
 {href:"/app/pipeline/cliente",label:"Pipeline",detail:"Kanban e lista das trilhas"}
];

export function RelationshipNavigation(){return <nav className="relationship-navigation" aria-label="Relacionamento com clientes">{ITEMS.map(item=><Link href={item.href} key={item.href}><strong>{item.label}</strong><small>{item.detail}</small></Link>)}</nav>;}
