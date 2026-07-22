import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { getEffectiveApplications } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { context, applications } = await getEffectiveApplications();
  const navigation = applications.filter(item => item.applicationKey !== "dashboard");

  return (
    <div className="shell">
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>

      <aside className="sidebar" aria-label="Navegação principal">
        <Link className="brand" href="/app" aria-label="Innovar — Central de aplicativos">
          <span className="brand-mark" aria-hidden="true">IN</span>
          <span>
            <strong className="brand-name">INNOVAR</strong>
            <small>Gestão integrada</small>
          </span>
        </Link>

        <nav className="nav" aria-label="Aplicativos autorizados">
          <Link href="/app">
            <span className="nav-icon" aria-hidden="true">⌂</span>
            <span>Início</span>
          </Link>
          {navigation.map(application => (
            <Link key={application.applicationKey} href={application.routePrefix}>
              <span className="nav-icon" aria-hidden="true">{application.icon}</span>
              <span>{application.name}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <small>{context.role}</small>
          <p>{context.email}</p>
          <form action={signOut}>
            <button className="button button-secondary" type="submit">Encerrar sessão</button>
          </form>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-context">
            <strong>Organização ativa</strong>
            <small>Aplicativos exibidos conforme perfil, capacidade e escopo</small>
          </div>
          <div className="topbar-meta">
            <span className="organization-chip mono" title={context.organizationId}>
              {context.organizationId.slice(0, 8)}
            </span>
          </div>
        </header>
        <div id="conteudo-principal" className="main-content-anchor" tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
}
