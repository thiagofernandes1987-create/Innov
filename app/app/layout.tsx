import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { requireOrganizationContext } from "@/lib/auth";

const navItems = [
  ["Visão geral", "/app/orcamentos"],
  ["CRM", "/app/crm"],
  ["Clientes", "/app/clientes"],
  ["Obras", "/app/obras"],
  ["Planejamento", "/app/planejamento"],
  ["Orçamentos", "/app/orcamentos"],
  ["Propostas", "/app/propostas"],
  ["Contratos", "/app/contratos"],
  ["Aditivos", "/app/aditivos"],
  ["Assinaturas", "/app/assinaturas"],
  ["Documentos", "/app/documentos"],
  ["Auditoria", "/app/auditoria"]
] as const;

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await requireOrganizationContext([
    "SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "COMERCIAL", "GESTOR_OBRAS",
    "ENGENHEIRO", "ORCAMENTISTA", "FINANCEIRO", "QUALIDADE", "SAC"
  ]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">I</div>
          <div><strong>INNOVAR</strong><small>Gestão integrada</small></div>
        </div>
        <nav className="nav" aria-label="Navegação interna">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href}><span>{label}</span></Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <small>{context.role}</small>
          <p style={{ overflowWrap: "anywhere" }}>{context.email}</p>
          <form action={signOut}><button className="button button-secondary" type="submit">Sair</button></form>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <strong>Organização ativa</strong>
          <span className="mono" style={{ fontSize: 12 }}>{context.organizationId.slice(0, 8)}</span>
        </header>
        {children}
      </div>
    </div>
  );
}
