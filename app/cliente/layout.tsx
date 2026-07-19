import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { requireClientContext } from "@/lib/auth";

const clientNav = [
  ["Início", "/cliente/orcamentos"],
  ["Orçamentos e propostas", "/cliente/orcamentos"],
  ["Contratos", "/cliente/contratos"],
  ["Aditivos", "/cliente/aditivos"],
  ["Assinaturas", "/cliente/assinaturas"],
  ["Documentos", "/cliente/documentos"],
  ["Ocorrências", "/cliente/ocorrencias"],
  ["Perfil e segurança", "/cliente/perfil"]
] as const;

export default async function ClientLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, client } = await requireClientContext();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">I</div>
          <div><strong>INNOVAR</strong><small>Portal do cliente</small></div>
        </div>
        <nav className="nav" aria-label="Navegação do cliente">
          {clientNav.map(([label, href]) => <Link key={href} href={href}><span>{label}</span></Link>)}
        </nav>
        <div className="sidebar-footer">
          <strong>{client.trade_name || client.legal_name}</strong>
          <p>{user.email}</p>
          <form action={signOut}><button className="button button-secondary" type="submit">Sair</button></form>
        </div>
      </aside>
      <div className="main">
        <header className="topbar"><strong>Portal do cliente</strong><span>Conteúdo comercial liberado</span></header>
        {children}
      </div>
    </div>
  );
}
