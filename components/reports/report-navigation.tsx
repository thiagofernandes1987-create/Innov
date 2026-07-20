import Link from"next/link";

const items=[
 ["/app/relatorios","Executivo"],["/app/relatorios/obras","Obras"],["/app/relatorios/financeiro","Financeiro"],
 ["/app/relatorios/compras","Compras"],["/app/relatorios/qualidade","Qualidade"],["/app/relatorios/metas","Metas"],
 ["/app/relatorios/salvos","Salvos"],["/app/relatorios/snapshots","Snapshots"]
]as const;

export function ReportNavigation(){return <nav className="report-nav" aria-label="Seções de relatórios">{items.map(([href,label])=><Link href={href} key={href}>{label}</Link>)}</nav>;}
