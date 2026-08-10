import {
  alternarItemDeLista,
  criarItemDeLista,
  moverItemDeLista,
  renomearItemDeLista
} from "@/app/actions/listas";
import { requireCapability } from "@/lib/authorization";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { listaDoEscopo } from "@/lib/listas/servidor";
import { ESCOPOS } from "@/lib/sugestoes/servidor";

export const dynamic = "force-dynamic";

// Motivos de perda — a lista que o funil oferece ao marcar um negócio como
// perdido.
//
// Pedido do responsável: *"quando for para perdido precisa abrir um formulário
// com os motivos da perca do lead, tipo parou de responder, praça errada,
// Produto errado, etc… esses itens tem que ser possível cadastrar no menu"*.
//
// A lista é **curada**, e é por isso que ela existe: motivo de perda alimenta
// contagem — "quantos perdemos por preço neste trimestre" — e contagem sobre
// texto que cada pessoa escreve do seu jeito não fecha. O relato do caso
// continua existindo, na observação, que é livre e não entra em contagem
// nenhuma.

const ESCOPO = ESCOPOS.motivoDePerda;

export default async function MotivosDePerdaPage() {
  const contexto = await requireCapability("administracao", "manage");

  const resultado = await contexto.supabase
    .from("managed_list_values")
    .select("id")
    .eq("organization_id", contexto.organizationId)
    .eq("scope", ESCOPO)
    .limit(1);
  reportDataAccessError("motivos-de-perda.lista", resultado.error);

  const itens = await listaDoEscopo(contexto.supabase, contexto.organizationId, ESCOPO, {
    apenasAtivos: false
  });
  const ativos = itens.filter(i => i.ativo);

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <span className="badge">FUNIL COMERCIAL</span>
          <h1>Motivos de perda</h1>
          <p>
            O que o formulário oferece ao marcar um negócio como perdido. {ativos.length} em uso
            de {itens.length} cadastrados.
          </p>
        </div>
      </section>

      {resultado.error ? (
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
      ) : null}

      <section className="card card-pad">
        <h2>Acrescentar motivo</h2>
        <p className="muted">
          Curto e comparável — é o que permite somar por trimestre. Entra no fim da lista; as setas
          mudam a ordem.
        </p>
        <form action={criarItemDeLista} className="field-form" style={{ marginTop: 14 }}>
          <input type="hidden" name="escopo" value={ESCOPO} />
          <label>
            Motivo
            <input name="rotulo" required maxLength={80} placeholder="Parou de responder" />
          </label>
          <button className="button button-primary" type="submit">Acrescentar</button>
        </form>
      </section>

      <section className="card card-pad" style={{ marginTop: 22 }}>
        <h2>Lista</h2>
        <p className="muted">
          Tirar de circulação <strong>não exclui</strong>: o motivo some do formulário e continua nos
          negócios que já o escolheram — senão a contagem do trimestre passado mudaria sozinha.
        </p>

        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr><th>Ordem</th><th>Motivo</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {itens.map((item, indice) => (
                <tr key={item.id}>
                  <td>
                    <div className="linha-de-ordem">
                      <form action={moverItemDeLista}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="direcao" value="cima" />
                        <button
                          className="button button-secondary"
                          type="submit"
                          disabled={indice === 0}
                          aria-label={`Subir ${item.rotulo}`}
                        >↑</button>
                      </form>
                      <form action={moverItemDeLista}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="direcao" value="baixo" />
                        <button
                          className="button button-secondary"
                          type="submit"
                          disabled={indice === itens.length - 1}
                          aria-label={`Descer ${item.rotulo}`}
                        >↓</button>
                      </form>
                    </div>
                  </td>
                  <td>
                    <form action={renomearItemDeLista} className="linha-de-renomear">
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        name="rotulo"
                        defaultValue={item.rotulo}
                        required
                        maxLength={80}
                        aria-label={`Nome do motivo ${item.rotulo}`}
                      />
                      <button className="button button-secondary" type="submit">Salvar</button>
                    </form>
                  </td>
                  <td>
                    {item.ativo
                      ? <span className="badge badge-success">Em uso</span>
                      : <span className="badge">Fora de circulação</span>}
                  </td>
                  <td>
                    <form action={alternarItemDeLista}>
                      <input type="hidden" name="id" value={item.id} />
                      <button className="button button-secondary" type="submit">
                        {item.ativo ? "Tirar de circulação" : "Voltar para a lista"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!itens.length ? (
                <tr><td colSpan={4}><div className="empty-state">
                  <h2>Nenhum motivo cadastrado</h2>
                  <p>Acrescente o primeiro acima. Sem lista, o funil não consegue registrar a perda.</p>
                </div></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
