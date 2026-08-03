import Link from "next/link";
import { notFound } from "next/navigation";
import {
  acrescentarCampo,
  alternarBuscaDoCampo,
  definirOpcoesDoCampo,
  publicarObjeto,
  removerCampo
} from "@/app/actions/objetos";
import { requireCapability } from "@/lib/authorization";
import { MODULE_REGISTRY } from "@/lib/modules/registry";
import { definicaoPorId } from "@/lib/object-runtime/estudio";
import { PROPOSITOS, propositoDoTipo } from "@/lib/object-runtime/proposito";
import { slotFamilyFor, slotUsage, validateSpec } from "@/lib/object-runtime/spec";

export const dynamic = "force-dynamic";

// Declaração dos campos de um objeto.
//
// **A tela pergunta o que a informação faz — não qual é o tipo dela.** É a
// tarefa T-32.3.1 do inventário, e a diferença não é de rótulo: quem cria o
// campo é o administrador da empresa, e a pergunta que ele sabe responder é
// "vou anotar o responsável pela vistoria". Que isso seja um `usuario`
// ocupando um slot da família `ref` é problema do motor, e o motor resolve
// sozinho a partir da resposta.
//
// O segundo efeito é que o campo **nasce filtrável** onde o tipo permite
// (T-32.3.2). Campo que não entra na busca vira campo que ninguém lê; e o
// orçamento de campos filtráveis aparece na tela enquanto ainda dá para
// escolher, em vez de na hora de publicar, com trinta campos já digitados.

const FAMILIA: Record<string, string> = {
  txt: "texto e escolha",
  num: "número, dinheiro e percentual",
  dt: "data",
  bool: "sim ou não",
  ref: "pessoa e registro"
};

export default async function ObjetoPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const contexto = await requireCapability("administracao", "manage");
  const { id } = await params;
  const { error } = await searchParams;

  const definicao = await definicaoPorId(contexto.supabase, contexto.organizationId, id);
  if (!definicao) notFound();

  const campos = definicao.rascunho.fields;
  const uso = slotUsage(campos);
  const pendencias = validateSpec(definicao.rascunho);
  const publicado = definicao.versaoAtual !== null;
  const aplicativo = MODULE_REGISTRY.find(m => m.key === definicao.moduleKey)?.name ?? definicao.moduleKey;

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <span className="badge">OBJETOS DA EMPRESA</span>
          <h1>{definicao.nome}</h1>
          <p>
            Herda a permissão de <strong>{aplicativo}</strong>.{" "}
            {definicao.escopo === "projeto"
              ? "Cada registro pertence a uma obra."
              : "Os registros valem para a empresa inteira."}{" "}
            {publicado ? `Publicado na versão ${definicao.versaoAtual}.` : "Ainda em rascunho."}
          </p>
        </div>
        <Link className="text-link" href="/app/administracao/objetos">← Todos os objetos</Link>
      </section>

      {error ? <div className="validation blocking" role="alert">{error}</div> : null}

      <section className="card card-pad">
        <h2>Campos declarados</h2>
        {campos.length === 0 ? (
          <p className="muted" style={{ marginTop: 10 }}>
            Nenhum campo ainda. Comece pelo que identifica o registro — o nome, a data, o
            responsável.
          </p>
        ) : (
          <table className="data-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Campo</th>
                <th>O que é</th>
                <th>Entra na busca</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {campos.map(campo => {
                const escolhido = propositoDoTipo(campo.type);
                const filtravel = Boolean(campo.indexed);
                return (
                  <tr key={campo.key}>
                    <td>
                      <strong>{campo.label}</strong>
                      {campo.required ? <> <span className="badge badge-neutral">obrigatório</span></> : null}
                      <br />
                      <small className="muted">{campo.key}</small>
                      {campo.type === "selecao" || campo.type === "selecao_multipla" ? (
                        <form action={definirOpcoesDoCampo} style={{ marginTop: 8 }}>
                          <input type="hidden" name="definitionId" value={definicao.id} />
                          <input type="hidden" name="campo" value={campo.key} />
                          <label style={{ display: "block" }}>
                            <small className="muted">Opções, uma por linha</small>
                            <textarea
                              name="opcoes"
                              rows={3}
                              defaultValue={(campo.options ?? []).join("\n")}
                              placeholder={"Aprovado\nAprovado com ressalva\nReprovado"}
                            />
                          </label>
                          <button className="button" type="submit">Guardar opções</button>
                        </form>
                      ) : null}
                    </td>
                    <td>
                      {escolhido?.pergunta ?? campo.type}
                      <br />
                      <small className="muted">{escolhido?.efeito}</small>
                    </td>
                    <td>
                      {slotFamilyFor(campo.type) === null ? (
                        <small className="muted">
                          Não entra na busca — este tipo não tem coluna filtrável.
                        </small>
                      ) : (
                        <form action={alternarBuscaDoCampo}>
                          <input type="hidden" name="definitionId" value={definicao.id} />
                          <input type="hidden" name="campo" value={campo.key} />
                          <button className={filtravel ? "button button-primary" : "button"} type="submit">
                            {filtravel ? "Sim — desligar" : "Não — ligar"}
                          </button>
                        </form>
                      )}
                    </td>
                    <td>
                      {publicado ? (
                        <small className="muted">publicado</small>
                      ) : (
                        <form action={removerCampo}>
                          <input type="hidden" name="definitionId" value={definicao.id} />
                          <input type="hidden" name="campo" value={campo.key} />
                          <button className="button" type="submit">Remover</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="orcamento-de-slots">
          <p className="muted">
            Campos que entram na busca, por tipo. O limite não é decoração: é o que garante que a
            listagem responda rápido com milhões de registros.
          </p>
          <ul>
            {(["txt", "num", "dt", "bool", "ref"] as const).map(familia => (
              <li key={familia} data-cheio={uso[familia].used >= uso[familia].budget ? "sim" : "nao"}>
                <strong>{uso[familia].used} de {uso[familia].budget}</strong>
                <span>{FAMILIA[familia]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card card-pad" style={{ marginTop: 22 }}>
        <h2>Acrescentar campo</h2>
        <p className="muted">
          Diga o que a informação é. O tipo sai daí — e com ele o que dá para filtrar, somar e
          ordenar depois.
        </p>
        <form action={acrescentarCampo} style={{ marginTop: 14 }}>
          <input type="hidden" name="definitionId" value={definicao.id} />
          <label className="campo-rotulo">
            Como esse campo se chama
            <input name="rotulo" required maxLength={80} placeholder="Responsável pela vistoria" />
          </label>

          <fieldset className="propositos">
            <legend>O que essa informação é?</legend>
            <div className="propositos-lista">
              {PROPOSITOS.map((item, indice) => (
                <label className="proposito" key={item.id}>
                  <input type="radio" name="proposito" value={item.id} required defaultChecked={indice === 0} />
                  <span>
                    <strong>{item.pergunta}</strong>
                    <small>{item.exemplo}</small>
                    <small className="muted">{item.efeito}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="campo-obrigatorio">
            <input type="checkbox" name="obrigatorio" />
            <span>Sem esse campo o registro não pode ser salvo</span>
          </label>

          <button className="button button-primary" type="submit">Acrescentar campo</button>
        </form>
      </section>

      <section className="card card-pad" style={{ marginTop: 22 }}>
        <h2>{publicado ? "Publicar nova versão" : "Publicar"}</h2>
        <p className="muted">
          Publicar congela esta definição numa versão. Registro gravado guarda a versão com que
          nasceu e continua legível por ela, mesmo depois de o objeto mudar.
        </p>
        {pendencias.length ? (
          <div className="validation" role="status" style={{ marginTop: 12 }}>
            <strong>Falta resolver antes de publicar:</strong>
            <ul style={{ margin: "8px 0 0 18px" }}>
              {pendencias.map(pendencia => <li key={pendencia}>{pendencia}</li>)}
            </ul>
          </div>
        ) : null}
        <form action={publicarObjeto} style={{ marginTop: 14 }}>
          <input type="hidden" name="definitionId" value={definicao.id} />
          <button className="button button-primary" type="submit" disabled={pendencias.length > 0}>
            {publicado ? `Publicar versão ${(definicao.versaoAtual ?? 0) + 1}` : "Publicar objeto"}
          </button>
        </form>
      </section>
    </main>
  );
}
