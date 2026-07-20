import Link from "next/link";
import { getEffectiveApplications } from "@/lib/authorization";

const accessLabel = { READ:"Somente leitura", READ_WRITE:"Leitura e edição", FULL:"Acesso completo", NONE:"Sem acesso" } as const;

export default async function ApplicationDashboard() {
  const { context, applications } = await getEffectiveApplications();
  const modules = applications.filter(item => item.applicationKey !== "dashboard");
  const categories = [...new Set(modules.map(item => item.category))];

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <span className="badge">CENTRAL DE APLICATIVOS</span>
          <h1>Olá, {context.email?.split("@")[0] ?? "usuário"}.</h1>
          <p>Seu painel mostra somente os módulos habilitados para seus perfis e escopos de acesso.</p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="card"><small>APLICATIVOS</small><strong>{modules.length}</strong><span>habilitados para você</span></article>
        <article className="card"><small>PERFIL LEGADO</small><strong style={{ fontSize:20 }}>{context.role}</strong><span>mantido durante a transição</span></article>
        <article className="card"><small>ORGANIZAÇÃO</small><strong style={{ fontSize:20 }}>{context.organizationId.slice(0,8)}</strong><span>escopo ativo</span></article>
      </section>

      {categories.map(category => (
        <section key={category} style={{ marginTop:32 }}>
          <div className="section-heading"><div><span className="eyebrow">{category}</span><h2>Aplicativos</h2></div></div>
          <div className="card-grid">
            {modules.filter(item => item.category === category).map(application => (
              <Link className="card" href={application.routePrefix} key={application.applicationKey} style={{ textDecoration:"none", color:"inherit" }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:16, alignItems:"flex-start" }}>
                  <span aria-hidden="true" style={{ fontSize:28 }}>{application.icon}</span>
                  <span className="badge">{accessLabel[application.accessLevel]}</span>
                </div>
                <h3 style={{ marginTop:24 }}>{application.name}</h3>
                <p>{application.description}</p>
                <span className="text-link">Abrir aplicativo →</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {modules.length === 0 && (
        <section className="empty-state card">
          <h2>Nenhum aplicativo habilitado</h2>
          <p>Solicite ao administrador que atribua um perfil ou capacidade à sua conta.</p>
        </section>
      )}
    </main>
  );
}
