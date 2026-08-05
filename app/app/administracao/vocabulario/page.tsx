import { limparValorDoCatalogo } from "@/app/actions/sugestoes";
import { requireCapability } from "@/lib/authorization";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { situacaoDoValor, type ValorDoCatalogo } from "@/lib/sugestoes/catalogo";
import { descreverEscopo } from "@/lib/sugestoes/escopos";

export const dynamic = "force-dynamic";

// Vocabulário da organização — o que a sugestão oferece, e o que sai dela.
//
// A tarefa diz por que isto é de administrador: *"limpar o catálogo é ação de
// administrador, porque o catálogo é da organização"*. O vocabulário não é de
// quem digitou; é de todo mundo que preenche aquele campo. Deixar cada pessoa
// apagar da própria lista faria o catálogo divergir por usuário — que é o
// problema que ele existe para resolver.
//
// A tela mostra os dois grupos separados: o que está sendo sugerido e o que o
// próprio corte já esconde (uso único, mais de seis meses). Misturar os dois
// faria o administrador limpar à mão o que já estava resolvido.

const formatador = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function quando(iso: string | null): string {
  if (!iso) return "—";
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "—" : formatador.format(data);
}

export default async function VocabularioPage() {
  const contexto = await requireCapability("administracao", "manage");

  const resultado = await contexto.supabase
    .from("value_catalog")
    .select("scope, label, normalized, uses, last_used_at")
    .eq("organization_id", contexto.organizationId)
    .order("scope")
    .order("uses", { ascending: false });

  reportDataAccessError("vocabulario.catalogo", resultado.error);

  const agora = new Date();
  const porEscopo = new Map<string, ValorDoCatalogo[]>();
  for (const linha of resultado.data ?? []) {
    const escopo = String(linha.scope);
    const valor: ValorDoCatalogo = {
      rotulo: String(linha.label),
      chave: String(linha.normalized),
      usos: Number(linha.uses),
      ultimoUso: linha.last_used_at ? String(linha.last_used_at) : null
    };
    porEscopo.set(escopo, [...(porEscopo.get(escopo) ?? []), valor]);
  }

  const escopos = [...porEscopo.entries()].map(([chave, valores]) => ({
    ...descreverEscopo(chave),
    sugeridos: valores.filter(v => situacaoDoValor(v, agora) === "sugerido"),
    ocultos: valores.filter(v => situacaoDoValor(v, agora) === "oculto_por_desuso")
  }));

  const total = (resultado.data ?? []).length;

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <span className="badge">VOCABULÁRIO DA EMPRESA</span>
          <h1>Sugestões de preenchimento</h1>
          <p>
            O que a plataforma oferece nos campos que se repetem entre obras. O catálogo se forma
            pelo uso — não há nada a cadastrar aqui.
          </p>
        </div>
      </section>

      {resultado.error ? (
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
      ) : null}

      {!resultado.error && total === 0 ? (
        <div className="empty-state">
          <h2>Nenhum valor no vocabulário ainda</h2>
          <p>
            O catálogo se forma pelo uso: cada etapa de EAP ou atividade criada no cronograma entra
            aqui e passa a ser sugerida na próxima. Nada a fazer nesta tela até lá.
          </p>
        </div>
      ) : null}

      {escopos.map(escopo => (
        <section className="card card-pad" key={escopo.chave} style={{ marginTop: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
            <div>
              <h2>{escopo.nome}</h2>
              <p className="muted">{escopo.origem}</p>
            </div>
            {!escopo.emUso ? (
              <span className="badge">Sugestão ainda não ligada nesta tela</span>
            ) : null}
          </div>

          {/* O aviso fica ao lado do botão que ele justifica. No alto da página
              ele seria lido antes de existir a decisão — e esquecido na hora
              em que ela é tomada. */}
          <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
            Remover tira o valor da sugestão. <strong>Nenhum registro já gravado muda</strong> — a
            etapa que se chama assim continua se chamando assim.
          </p>

          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr><th>Valor</th><th>Usos</th><th>Último uso</th><th>Situação</th><th></th></tr>
              </thead>
              <tbody>
                {[...escopo.sugeridos, ...escopo.ocultos].map(valor => {
                  const oculto = escopo.ocultos.includes(valor);
                  return (
                    <tr key={valor.chave}>
                      <td><strong>{valor.rotulo}</strong></td>
                      <td>{valor.usos}</td>
                      <td>{quando(valor.ultimoUso)}</td>
                      <td>
                        {oculto ? (
                          <span className="badge" title="Uso único há mais de seis meses: a sugestão já não oferece este valor.">
                            Já oculto por desuso
                          </span>
                        ) : (
                          <span className="badge badge-success">Sugerido</span>
                        )}
                      </td>
                      <td>
                        <form action={limparValorDoCatalogo}>
                          <input type="hidden" name="escopo" value={escopo.chave} />
                          <input type="hidden" name="valor" value={valor.rotulo} />
                          <button className="button button-secondary" type="submit">
                            Remover do vocabulário
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </main>
  );
}
