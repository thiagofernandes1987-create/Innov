import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { listAccessibleModules, requireOrganizationContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await requireOrganizationContext([
    "SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "COMERCIAL", "GESTOR_OBRAS",
    "ENGENHEIRO", "ORCAMENTISTA", "FINANCEIRO", "QUALIDADE", "SAC"
  ]);
  const modules = await listAccessibleModules(context);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">I</div>
          <div><strong>INNOVAR</strong><small>Gestão integrada</small></div>
        </div>
        <nav className="nav" aria-label="Navegação interna">
          <Link href="/app"><span>Aplicativos</span></Link>
          {modules.map((module) => (
            <Link key={module.module_id} href={module.module_href}>
              <span>{module.module_name}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <small>{context.role}</small>
          <p style={{ overflowWrap: "anywhere" }}>{context.email}</p>
          <form action={signOut}>
            <button className="button button-secondary" type="submit">Sair</button>
          </form>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <strong>Organização ativa</strong>
          <span>{modules.length} aplicativo(s) habilitado(s)</span>
        </header>
        {children}
      </div>
    </div>
  );
}
