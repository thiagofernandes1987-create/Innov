import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { getEffectiveApplications } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { context, applications } = await getEffectiveApplications();
  const navigation = applications.filter(item => item.applicationKey !== "dashboard");

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">I</div>
          <div><strong>INNOVAR</strong><small>Gestão integrada</small></div>
        </div>
        <nav className="nav" aria-label="Aplicativos autorizados">
          <Link href="/app"><span>Início</span></Link>
          {navigation.map(application => (
            <Link key={application.applicationKey} href={application.routePrefix}>
              <span aria-hidden="true" style={{ width: 20, textAlign: "center" }}>{application.icon}</span>
              <span>{application.name}</span>
            </Link>
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
          <div><strong>Organização ativa</strong><small style={{ display:"block", color:"var(--muted)" }}>Aplicativos conforme seu perfil de acesso</small></div>
          <span className="mono" style={{ fontSize: 12 }}>{context.organizationId.slice(0, 8)}</span>
        </header>
        {children}
      </div>
    </div>
  );
}
