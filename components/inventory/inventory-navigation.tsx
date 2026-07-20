import Link from"next/link";

const links=[
 ["/app/estoque","Visão geral"],["/app/estoque/itens","Itens"],["/app/estoque/depositos","Depósitos"],
 ["/app/estoque/movimentos","Movimentos"],["/app/estoque/reservas","Reservas"],
 ["/app/estoque/ativos","Ativos"],["/app/estoque/inventarios","Inventários"]
]as const;

export function InventoryNavigation(){return <nav className="inventory-nav" aria-label="Seções de estoque">{links.map(([href,label])=><Link href={href} key={href}>{label}</Link>)}</nav>;}
