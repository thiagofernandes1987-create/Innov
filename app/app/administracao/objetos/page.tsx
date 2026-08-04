import Link from "next/link";
import { criarObjeto } from "@/app/actions/objetos";
import { requireCapability } from "@/lib/authorization";
import { MODULE_REGISTRY } from "@/lib/modules/registry";
import { definicoesDaOrganizacao } from "@/lib/object-runtime/estudio";

export const dynamic = "force-dynamic";

// Estúdio de objetos — a lista e a criação.
//
// É o que a empresa cliente registra que só ela faz: um checklist de vistoria
// próprio, um cadastro auxiliar, um apontamento que o setor dela inventou.
// Contrato em `diretrizes/OBJECT-RUNTIME.md`.
//
// **O objeto declara de qual aplicativo herda a permissão**, e é isso que
// dispensa uma segunda árvore de perfis: quem enxerga Qualidade enxerga o
// checklist da Qualidade, no nível que o perfil dele já define.

const ESTADO: Record<string, { rotulo: string; classe: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "badge badge-neutral" },
  publicado: { rotulo: "Publicado", classe: "badge badge-success" },
  depreciado: { rotulo: "Depreciado", classe: "badge badge-warning" }
};

export default async function ObjetosPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const contexto = await requireCapability("administracao", "manage");
  const params = await searchParams;
  const definicoes = await definicoesDaOrganizacao(contexto.supabase, contexto.organizationId);

  // Aplicativos de sistema não recebem extensão: não faz sentido pendurar um
  // cadastro próprio em Auditoria ou em Administração.
  const aplicativos = MODULE_REGISTRY.filter(modulo => !modulo.system);

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <span className="badge">OBJETOS DA EMPRESA</span>
          <h1>Objetos</h1>
          <p>
            O que só a sua empresa faz, registrado sem esperar por código. {definicoes.length}{" "}
            {definicoes.length === 1 ? "objeto" : "objetos"} nesta empresa.
          </p>
        </div>
      </section>

      {params.error ? (
        <div className="validation blocking" role="alert">{params.error}</div>
      ) : null}

      <section className="card card-pad">
        <h2>Criar objeto</h2>
        <p className="muted">
          O nome vira a identificação do objeto. De qual aplicativo ele herda a permissão decide
          quem vai enxergá-lo — não existe lista de acesso separada.
        </p>
        <form action={criarObjeto} className="field-form" style={{ marginTop: 14 }}>
          <label>
            Nome do objeto
            <input name="nome" required maxLength={80} placeholder="Vistoria de entrega" />
          </label>
          <label>
            Herda a permissão de
            <select name="moduleKey" required defaultValue="qualidade">
              {aplicativos.map(modulo => (
                <option key={modulo.key} value={modulo.key}>{modulo.name}</option>
              ))}
            </select>
          </label>
          <label>
            Alcance
            <select name="escopo" defaultValue="organizacao">
              <option value="organizacao">A empresa inteira</option>
              <option value="projeto">Cada registro pertence a uma obra</option>
            </select>
          </label>
          <button className="button button-primary" type="submit">Criar rascunho</button>
        </form>
      </section>

      <section className="card card-pad" style={{ marginTop: 22 }}>
        <h2>Objetos declarados</h2>
        {definicoes.length === 0 ? (
          <p className="muted" style={{ marginTop: 10 }}>
            Nenhum objeto ainda. O primeiro costuma ser aquele formulário que hoje vive numa
            planilha à parte.
          </p>
        ) : (
          <table className="data-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Objeto</th>
                <th>Aplicativo</th>
                <th>Campos</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {definicoes.map(definicao => {
                const estado = ESTADO[definicao.status] ?? {
                  rotulo: definicao.status,
                  classe: "badge badge-neutral"
                };
                return (
                  <tr key={definicao.id}>
                    <td>
                      <Link className="text-link" href={`/app/administracao/objetos/${definicao.id}`}>
                        {definicao.nome}
                      </Link>
                      <br />
                      <small className="muted">{definicao.chave}</small>
                    </td>
                    <td>{MODULE_REGISTRY.find(m => m.key === definicao.moduleKey)?.name ?? definicao.moduleKey}</td>
                    <td>{definicao.rascunho.fields.length}</td>
                    <td>
                      <span className={estado.classe}>{estado.rotulo}</span>
                      {definicao.versaoAtual ? (
                        <>
                          {" "}
                          <small className="muted">versão {definicao.versaoAtual}</small>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
