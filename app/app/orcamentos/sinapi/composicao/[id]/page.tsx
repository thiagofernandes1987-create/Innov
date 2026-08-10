import Link from "next/link";
import { notFound } from "next/navigation";
import { addSinapiBudgetItem } from "@/app/actions/sinapi";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { requireOrganizationContext } from "@/lib/auth";
import { formatCurrency } from "@/lib/domain";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import {
  motivoDoItem,
  reconciliacaoDaComposicao,
  situacaoDaPlanilhaEmPortugues,
  type ItemDaComposicao
} from "@/lib/orcamentos/composicao";
import { singleRelation } from "@/lib/supabase/relations";

// **A composição analítica, aberta.** T-37.10.
//
// Quem entra: P11, o orçamentista (`PERSONAS-E-ROTINAS.md` §P11 — "esse preço
// paga o escopo e o risco?"). Também P2, quando precisa do custo do dia de
// atraso, e P13 em leitura.
//
// Vindo de onde: da linha da composição no catálogo `/app/orcamentos/sinapi`,
// pela contagem de componentes. **Um clique.**
//
// Para resolver o quê: antes de puxar um serviço para o orçamento, ver do que
// ele é feito e **se o custo publicado está inteiro**. Medido no arquivo de
// 06/2026, em SP: 2.859 das 8.403 composições (34%) têm ao menos um item sem
// preço coletado no estado. Nelas o custo oficial existe, mas a soma dos itens
// é menor — não porque o serviço seja barato, e sim porque parte dele não foi
// pesquisada. Sem essa distinção em tela, as duas se parecem, e a perigosa é a
// que passa despercebida.
//
// A barra 2 segue `PADRAO-DE-INTERFACE.md` §12.2: ação do módulo à esquerda,
// identidade curta ao lado. Sem busca (a tela é um registro, não uma coleção) e
// sem seletor de visualização — não existe segunda visualização que funcione, e
// ícone que não funciona ensina que ícone é enfeite (§12.3).

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ region?: string; relief?: string; error?: string; success?: string }>;
};

type ItemLido = ItemDaComposicao & {
  id: string;
  description: string;
  unit: string;
  item_type: string;
  source_code: string | null;
};

function formatarDataBase(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "2-digit", year: "numeric" })
    .format(new Date(`${valor}T12:00:00Z`));
}

function formatarCoeficiente(valor: number | string | null) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })
    .format(Number(valor ?? 0));
}

export default async function ComposicaoSinapiPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, organizationId } = await requireOrganizationContext([
    "SUPER_ADMIN", "DIRECAO", "ADMINISTRADOR", "ORCAMENTISTA", "FINANCEIRO"
  ]);

  const versaoResultado = await supabase
    .from("cost_composition_versions")
    .select(
      "id, unit_cost, region, base_date, tax_relief, source_url, items_without_cost, composition:cost_compositions!cost_composition_versions_composition_id_fkey(id, code, name, unit, source_record_id)"
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  reportDataAccessError("sinapi.composicao.versao", versaoResultado.error);
  if (!versaoResultado.error && !versaoResultado.data) notFound();

  const versao = versaoResultado.data;
  const composicao = singleRelation(versao?.composition);

  const itensResultado = versao
    ? await supabase
        .from("cost_composition_items")
        .select("id, description, unit, item_type, source_code, coefficient, unit_cost, total_cost, price_status, sinapi_situation")
        .eq("composition_version_id", versao.id)
        .eq("organization_id", organizationId)
        .order("item_type", { ascending: true })
        .order("description", { ascending: true })
    : { data: [], error: null };

  reportDataAccessError("sinapi.composicao.itens", itensResultado.error);

  const itens = (itensResultado.data ?? []) as ItemLido[];
  const conta = reconciliacaoDaComposicao(versao?.unit_cost ?? 0, itens);
  const falhouCarga = Boolean(versaoResultado.error || itensResultado.error);

  const voltarPara = `/app/orcamentos/sinapi?region=${versao?.region ?? query.region ?? "SP"}&relief=${String(versao?.tax_relief ?? query.relief === "true")}&kind=COMPOSITION`;

  // Versões editáveis para o gesto de adicionar, o mesmo do catálogo: quem abre
  // a composição para conferir costuma decidir ali mesmo, e mandar de volta
  // para a lista só para adicionar custaria dois cliques e o contexto.
  const { data: orcamentos } = await supabase
    .from("budgets")
    .select("id, code, title, current_version_id")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  const versaoAtualIds = (orcamentos ?? [])
    .map(orcamento => orcamento.current_version_id)
    .filter((valor): valor is string => Boolean(valor));
  const { data: versoesDeOrcamento } = versaoAtualIds.length
    ? await supabase.from("budget_versions").select("id, budget_id, version_number, frozen_at").in("id", versaoAtualIds)
    : { data: [] };

  const versoesEditaveis = (versoesDeOrcamento ?? [])
    .filter(item => !item.frozen_at)
    .map(item => {
      const orcamento = (orcamentos ?? []).find(registro => registro.id === item.budget_id);
      return {
        id: item.id,
        rotulo: `${orcamento?.code ?? "ORÇ"} · V${item.version_number} · ${orcamento?.title ?? "Orçamento"}`
      };
    });

  const contaRotulo = {
    FECHA: { texto: "A soma dos itens fecha com o custo publicado", classe: "badge badge-success" },
    NAO_FECHA: { texto: "A soma dos itens não fecha com o custo publicado", classe: "badge badge-warning" },
    INCOMPLETA: { texto: "Composição incompleta", classe: "badge badge-warning" },
    SEM_ITENS: { texto: "Sem composição analítica", classe: "badge" }
  }[conta.situacao];

  return (
    <main className="content">
      <p style={{ margin: "0 0 4px" }}>
        {/* Voltar é navegação, não ação de módulo: a esquerda da barra 2 é de
            `Novo`, `Publicar`, `Importar` e `Aprovar` (§12.2). O padrão de volta
            já existe em `/app/modelos/emitir`. */}
        <Link className="link-de-volta" href={voltarPara}>
          Voltar ao catálogo SINAPI
        </Link>
      </p>
      <BarraDeTrabalho
        title={`Composição ${composicao?.source_record_id ?? ""}`}
        identity={
          <h1 className="barra-controle-titulo">
            <span className="mono">{composicao?.source_record_id ?? "—"}</span> · {composicao?.name ?? "Composição"}
          </h1>
        }
        meta={
          versao ? (
            <span className="muted">
              {versao.region} · {formatarDataBase(versao.base_date)} · {versao.tax_relief ? "com" : "sem"} desoneração
            </span>
          ) : null
        }
      />

      {falhouCarga ? <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div> : null}
      {query.success ? <div className="validation success" role="status">{query.success}</div> : null}
      {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}

      <section className="grid grid-kpi" aria-label="Resumo da composição">
        <article className="card kpi">
          <small>CUSTO UNITÁRIO PUBLICADO</small>
          <strong>{formatCurrency(Number(versao?.unit_cost ?? 0))}</strong>
          <span className="muted">por {composicao?.unit ?? "un"}</span>
        </article>
        <article className="card kpi">
          <small>ITENS</small>
          <strong>{conta.itens.toLocaleString("pt-BR")}</strong>
          <span className="muted">insumos e sub-composições</span>
        </article>
        <article className="card kpi">
          <small>SEM CUSTO PUBLICADO</small>
          <strong>{conta.itensSemCusto.toLocaleString("pt-BR")}</strong>
          <span className="muted">{conta.itensSemCusto ? "o custo abaixo é parcial" : "nenhum"}</span>
        </article>
        <article className="card kpi">
          <small>SOMA DOS ITENS</small>
          <strong>{formatCurrency(conta.soma)}</strong>
          <span className="muted">
            {conta.situacao === "SEM_ITENS"
              ? "sem itens para somar"
              : `${conta.diferenca >= 0 ? "+" : "−"}${formatCurrency(Math.abs(conta.diferenca))} contra o publicado`}
          </span>
        </article>
      </section>

      {/* O veredito em texto, não em cor: `UI-UX-PRO-MAX.md` §6 proíbe
          comunicar resultado só por verde e vermelho, e aqui a diferença entre
          "não fecha" e "incompleta" é justamente o que decide o que fazer. */}
      <section className="card card-pad composicao-veredito" style={{ marginTop: 18 }} aria-live="polite">
        <span className={contaRotulo.classe}>{contaRotulo.texto}</span>
        <p className="muted" style={{ margin: "8px 0 0" }}>
          {conta.situacao === "FECHA" ? (
            <>
              Os {conta.itens} itens somam {formatCurrency(conta.soma)} contra {formatCurrency(conta.custoPublicado)}{" "}
              publicados — diferença de {(conta.percentual * 100).toFixed(2).replace(".", ",")}%, dentro do
              arredondamento da própria planilha.
            </>
          ) : null}
          {conta.situacao === "INCOMPLETA" ? (
            <>
              {conta.itensSemCusto} {conta.itensSemCusto === 1 ? "item não tem" : "itens não têm"} preço publicado para{" "}
              {versao?.region}. O custo unitário acima é o oficial da CAIXA e continua válido; a soma dos itens é menor
              porque parte da composição não foi pesquisada neste estado — <strong>não porque o serviço seja barato</strong>.
              Antes de usar como preço de proposta, cotar os itens marcados abaixo.
            </>
          ) : null}
          {conta.situacao === "NAO_FECHA" ? (
            <>
              Todos os itens têm preço, mas a soma difere do custo publicado em{" "}
              {(conta.percentual * 100).toFixed(2).replace(".", ",")}%. Divergência de dado: conferir a data-base e o
              regime antes de usar em proposta.
            </>
          ) : null}
          {conta.situacao === "SEM_ITENS" ? (
            <>
              A aba analítica do relatório não trouxe itens para esta composição. O custo unitário publicado continua
              válido, mas não há memória de cálculo para conferir.
            </>
          ) : null}
        </p>
      </section>

      {versoesEditaveis.length ? (
        <section className="card card-pad" style={{ marginTop: 18 }}>
          <h2 style={{ marginTop: 0 }}>Adicionar ao orçamento</h2>
          <p className="muted">
            O preço é copiado para a versão escolhida. Atualização mensal futura não altera orçamento já emitido.
          </p>
          <form action={addSinapiBudgetItem} className="composicao-adicionar">
            <input type="hidden" name="kind" value="COMPOSITION" />
            <input type="hidden" name="referenceId" value={id} />
            <label>
              Orçamento
              <select name="versionId" required defaultValue="">
                <option value="" disabled>
                  Escolha o orçamento
                </option>
                {versoesEditaveis.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantidade
              <input name="quantity" type="number" min="0.000001" step="0.000001" defaultValue="1" required />
            </label>
            <button className="button button-primary" type="submit">
              Adicionar
            </button>
          </form>
        </section>
      ) : (
        <div className="validation" role="status" style={{ marginTop: 18 }}>
          Não há versão de orçamento editável. Crie uma nova versão para poder adicionar esta composição.
        </div>
      )}

      <section className="card" style={{ marginTop: 22 }}>
        <div className="card-pad">
          <h2 style={{ marginTop: 0 }}>Memória de cálculo</h2>
          <p className="muted">
            Coeficiente é a quantidade do item por {composicao?.unit ?? "unidade"} de serviço. Sub-composição entra com o
            custo publicado dela na mesma UF e regime.
          </p>
        </div>
        <div className="table-wrap">
          <table className="composicao-memoria">
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col">Código e descrição</th>
                <th scope="col">Un.</th>
                <th scope="col" className="numero">Coeficiente</th>
                <th scope="col" className="numero">Custo unit.</th>
                <th scope="col" className="numero">Custo total</th>
              </tr>
            </thead>
            <tbody>
              {itens.map(item => {
                const motivo = motivoDoItem(item.price_status);
                const situacao = situacaoDaPlanilhaEmPortugues(item.sinapi_situation);
                return (
                  <tr key={item.id} className={motivo ? "linha-sem-custo" : undefined}>
                    <td>
                      <span className="badge">{item.item_type === "COMPOSITION" ? "Composição" : "Insumo"}</span>
                    </td>
                    <td className="descricao">
                      {item.source_code ? <strong className="mono">{item.source_code}</strong> : null}
                      <div>{item.description}</div>
                      {motivo ? (
                        <small className="muted">
                          {motivo}
                          {situacao ? ` · situação no relatório: ${situacao.toLowerCase()}` : ""}
                        </small>
                      ) : null}
                    </td>
                    <td>{item.unit}</td>
                    <td className="mono numero">{formatarCoeficiente(item.coefficient)}</td>
                    <td className="mono numero">
                      {item.unit_cost === null ? <span className="muted">sem preço</span> : formatCurrency(Number(item.unit_cost))}
                    </td>
                    <td className="mono numero">
                      {item.total_cost === null ? <span className="muted">—</span> : formatCurrency(Number(item.total_cost))}
                    </td>
                  </tr>
                );
              })}
              {!itens.length && !falhouCarga ? (
                <tr>
                  <td colSpan={6}>
                    <div className="card-pad">
                      <strong>Esta composição não tem memória de cálculo importada.</strong>
                      <p className="muted">
                        A aba analítica do relatório da CAIXA não trouxe itens para ela. O custo unitário publicado
                        continua utilizável no orçamento.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {versao?.source_url ? (
        <p className="muted" style={{ marginTop: 14 }}>
          Fonte: relatório oficial da CAIXA, data-base {formatarDataBase(versao.base_date)}.
        </p>
      ) : null}
    </main>
  );
}
