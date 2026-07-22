import Link from "next/link";
import { getEffectiveApplications } from "@/lib/authorization";

const accessLabel = {
  READ: "Somente leitura",
  READ_WRITE: "Leitura e edição",
  FULL: "Acesso completo",
  NONE: "Sem acesso"
} as const;

const accessBadgeClass = {
  READ: "badge badge-neutral",
  READ_WRITE: "badge",
  FULL: "badge badge-success",
  NONE: "badge badge-danger"
} as const;

export default async function ApplicationDashboard() {
  const { context, applications } = await getEffectiveApplications();
  const modules = applications.filter(item => item.applicationKey !== "dashboard");
  const categories = [...new Set(modules.map(item => item.category))];
  const displayName = context.email?.split("@")[0] || "usuário";

  return (
    <main className="content dashboard-page">
      <section className="page-heading" aria-labelledby="dashboard-title">
        <div>
          <span className="eyebrow">Central de aplicativos</span>
          <h1 id="dashboard-title">Olá, {displayName}.</h1>
          <p>
            Acesse somente os módulos liberados para seus perfis, capacidades e escopos.
            O contexto organizacional permanece ativo durante toda a operação.
          </p>
        </div>
        <aside className="dashboard-summary" aria-label="Contexto da sessão">
          <span className="dashboard-summary-label">Contexto protegido</span>
          <strong>{context.role}</strong>
          <p>Organização <span className="mono">{context.organizationId.slice(0, 8)}</span></p>
        </aside>
      </section>

      <section className="stats-grid" aria-label="Resumo de acesso">
        <article className="card">
          <small>APLICATIVOS</small>
          <strong>{modules.length}</strong>
          <span>módulos habilitados nesta sessão</span>
        </article>
        <article className="card">
          <small>CATEGORIAS</small>
          <strong>{categories.length}</strong>
          <span>áreas operacionais disponíveis</span>
        </article>
        <article className="card">
          <small>PERFIL ATIVO</small>
          <strong>{context.role}</strong>
          <span>permissões também dependem de capacidade e escopo</span>
        </article>
      </section>

      {categories.map(category => {
        const categoryModules = modules.filter(item => item.category === category);
        const sectionId = `categoria-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

        return (
          <section className="category-section" key={category} aria-labelledby={sectionId}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">{category}</span>
                <h2 id={sectionId}>{categoryModules.length === 1 ? "Aplicativo" : "Aplicativos"}</h2>
              </div>
              <span className="badge badge-neutral">
                {categoryModules.length} {categoryModules.length === 1 ? "módulo" : "módulos"}
              </span>
            </div>

            <div className="card-grid">
              {categoryModules.map(application => (
                <Link
                  className="card module-card"
                  href={application.routePrefix}
                  key={application.applicationKey}
                  aria-label={`Abrir ${application.name}. ${accessLabel[application.accessLevel]}.`}
                >
                  <div className="module-card-head">
                    <span className="module-icon" aria-hidden="true">{application.icon}</span>
                    <span className={accessBadgeClass[application.accessLevel]}>
                      {accessLabel[application.accessLevel]}
                    </span>
                  </div>
                  <h3>{application.name}</h3>
                  <p>{application.description}</p>
                  <span className="module-card-footer" aria-hidden="true">
                    <span className="text-link">Abrir aplicativo</span>
                    <span className="module-arrow">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {modules.length === 0 && (
        <section className="empty-state card" role="status">
          <span className="eyebrow">Acesso</span>
          <h2>Nenhum aplicativo habilitado</h2>
          <p>Solicite ao administrador que atribua um perfil, capacidade ou escopo à sua conta.</p>
        </section>
      )}
    </main>
  );
}
