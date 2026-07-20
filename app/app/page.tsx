import Link from "next/link";
import { listAccessibleModules, requireOrganizationContext } from "@/lib/auth";

const accessLabels: Record<string, string> = {
  READ: "Somente leitura",
  EDIT: "Leitura e edição",
  DELETE: "Leitura, edição e exclusão"
};

function capabilities(module: Awaited<ReturnType<typeof listAccessibleModules>>[number]) {
  return [
    module.can_approve ? "Aprovar" : null,
    module.can_release ? "Liberar" : null,
    module.can_sign ? "Assinar" : null,
    module.can_export ? "Exportar" : null,
    module.can_administer ? "Administrar" : null,
    module.can_view_sensitive ? "Dados sensíveis" : null
  ].filter(Boolean) as string[];
}

export default async function AppsDashboardPage() {
  const context = await requireOrganizationContext();
  const modules = await listAccessibleModules(context);

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <span className="badge">PORTAL DO USUÁRIO</span>
          <h1>Aplicativos</h1>
          <p className="muted">
            Seu painel mostra somente os módulos permitidos pelo perfil e pelas exceções de acesso.
          </p>
        </div>
        <span className="badge badge-success">{modules.length} habilitado(s)</span>
      </div>

      <section className="app-catalog">
        {modules.map((module) => {
          const extra = capabilities(module);
          return (
            <article className="app-card" key={module.module_id}>
              <div className="app-card-icon" aria-hidden="true">
                {module.module_name.slice(0, 1)}
              </div>
              <div className="app-card-body">
                <div className="app-card-head">
                  <div>
                    <span className="badge">{accessLabels[module.access_level] ?? module.access_level}</span>
                    <h2>{module.module_name}</h2>
                  </div>
                  {module.sensitive ? <span className="badge badge-warning">Sensível</span> : null}
                </div>
                <p className="muted">{module.module_description}</p>
                {extra.length ? (
                  <div className="capability-list" aria-label="Capacidades adicionais">
                    {extra.map((item) => <span key={item}>{item}</span>)}
                  </div>
                ) : null}
                <div className="app-card-footer">
                  <small className="muted">Fonte: {module.permission_source}</small>
                  <Link className="button button-primary" href={module.module_href}>
                    Abrir aplicativo
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
        {!modules.length ? (
          <article className="card card-pad">
            <strong>Nenhum aplicativo está habilitado.</strong>
            <p className="muted">Solicite ao administrador a revisão do seu perfil de acesso.</p>
          </article>
        ) : null}
      </section>
    </main>
  );
}
