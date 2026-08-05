import Link from "next/link";
import { registrarCubManual } from "@/app/actions/cub";
import { BarraDeTrabalho } from "@/components/casca/barra-de-trabalho";
import { requireOrganizationContext } from "@/lib/auth";
import { TIPOLOGIAS_CUB, familiaDaTipologia, type FamiliaDeCub } from "@/lib/cost-sources/cub-serie-historica";
import { formatCurrency } from "@/lib/domain";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { UFS_DO_BRASIL, referenciasDaUf, ufDaReferencia } from "@/lib/orcamentos/cub-por-uf";

// **Registrar o CUB de um estado, à mão.** T-37.13b.
//
// Quem entra: **P11, o orçamentista** (`PERSONAS-E-ROTINAS.md` §P11). É a
// persona que já tem o PDF do Sinduscon aberto quando descobre que a obra é
// fora de São Paulo — por isso a alçada da RPC é EDIT em Orçamentos, e não
// `administer`: exigir a diretoria deixaria a tarefa com quem não a faz, e o
// efeito prático seria ninguém importar nada.
//
// Vindo de onde: **do estado vazio do orçamento** — "Sem CUB importado para
// MG" —, em **um clique**. Também dá para chegar direto pelo endereço, mas o
// caminho que importa é aquele, porque é onde a falta é descoberta.
//
// Para resolver o quê: a T-37.13a fez a tela seguir a UF da obra, e isso
// transformou um erro silencioso (obra em Minas recebendo o preço paulista) num
// beco honesto (nenhuma referência). Esta tela é a saída do beco. Sem ela, a
// saída que sobra é a pessoa trocar a UF para SP e usar o número errado de
// propósito — que é pior que o problema original, porque agora é deliberado.
//
// Em quantos cliques: um para chegar, um formulário, e a volta ao orçamento com
// a referência disponível.
//
// A barra 2 segue §12.2: ação do módulo à esquerda, identidade curta ao lado.
// Sem busca e sem seletor de visualização — é um formulário, não uma coleção, e
// ícone que não funciona ensina que ícone é enfeite (§12.3).

const ORDEM_DE_FAMILIA: readonly FamiliaDeCub[] = ["RESIDENCIAL", "COMERCIAL", "ESPECIAL"];
const ROTULO_DE_FAMILIA: Record<FamiliaDeCub, string> = {
  RESIDENCIAL: "Residencial",
  COMERCIAL: "Comercial",
  ESPECIAL: "Especiais"
};

type PageProps = {
  searchParams: Promise<{
    uf?: string;
    voltar?: string;
    error?: string;
    success?: string;
  }>;
};

type ReferenciaLida = {
  id: string;
  region: string;
  reference_code: string;
  base_date: string;
  tax_relief: boolean;
  total_cost: number | string;
  source_name: string;
  raw_payload: Record<string, unknown> | null;
};

function formatarMes(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "2-digit", year: "numeric" })
    .format(new Date(`${valor}T12:00:00Z`));
}

/** O mês passado, que é o CUB mais recente que costuma estar publicado. */
function mesSugerido() {
  const hoje = new Date();
  const referencia = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1));
  return `${referencia.getUTCFullYear()}-${String(referencia.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function ImportarCubPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase } = await requireOrganizationContext();

  const uf = ufDaReferencia({ ufDoProjeto: null, ufPedida: query.uf ?? null });
  const voltar = String(query.voltar ?? "").trim() || null;

  const { data, error } = await supabase
    .from("cost_reference_snapshots")
    .select("id, region, reference_code, base_date, tax_relief, total_cost, source_name, raw_payload")
    .order("base_date", { ascending: false });

  const falhouCarga = Boolean(error);
  if (error) reportDataAccessError("orcamentos.cub.importar", error);

  const referencias = (data ?? []) as ReferenciaLida[];
  const jaImportadas = referenciasDaUf(referencias, uf);
  const estadosComReferencia = [
    ...new Set(referencias.map(item => String(item.region).trim().toUpperCase()))
  ].sort();

  const tipologiasPorFamilia = ORDEM_DE_FAMILIA.map(familia => [
    familia,
    TIPOLOGIAS_CUB.filter(item => familiaDaTipologia(item.codigo) === familia)
  ] as const).filter(([, itens]) => itens.length > 0);

  const destinoDeVolta = voltar ? `/app/orcamentos/${voltar}?uf=${uf}` : "/app/orcamentos";

  return (
    <main className="content">
      <p style={{ margin: "0 0 4px" }}>
        {/* Voltar é navegação, não ação de módulo — a esquerda da barra 2 é de
            `Novo`, `Publicar`, `Importar` e `Aprovar` (§12.2). */}
        <Link className="link-de-volta" href={destinoDeVolta}>
          {voltar ? "Voltar ao orçamento" : "Voltar aos orçamentos"}
        </Link>
      </p>

      <BarraDeTrabalho
        title={`Importar CUB · ${uf}`}
        identity={<h1 className="barra-controle-titulo">Importar CUB de {uf}</h1>}
        meta={
          <span className="muted">
            {jaImportadas.length
              ? `${jaImportadas.length} referência(s) já registrada(s) neste estado`
              : "nenhuma referência registrada neste estado"}
          </span>
        }
      />

      {falhouCarga ? <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div> : null}
      {query.success ? <div className="validation success" role="status">{query.success}</div> : null}
      {query.error ? <div className="validation blocking" role="alert">{query.error}</div> : null}

      {/* O que a tela promete e o que ela **não** promete, antes do formulário.
          Uma declaração manual entra no catálogo oficial ao lado de referências
          que o servidor leu e conferiu. Quem preenche precisa saber que a
          diferença fica registrada — senão descobre depois, e aí a confiança no
          catálogo inteiro cai junto. */}
      <section className="card card-pad" style={{ marginTop: 18 }}>
        <span className="badge">DECLARAÇÃO MANUAL</span>
        <p className="muted" style={{ margin: "8px 0 0" }}>
          São Paulo é o único estado com leitura automática hoje: o servidor baixa a série histórica
          do SindusCon-SP, confere que as parcelas fecham e guarda o SHA-256 do arquivo. Para os
          outros 26, o caminho é este — e o que entra aqui fica marcado como{" "}
          <strong>declarado à mão</strong>, com seu nome e a data, porque o servidor não viu o
          arquivo. O endereço da publicação e o SHA-256 do PDF, quando informados, ficam guardados
          como <em>declarados</em>, não como conferidos.
        </p>
      </section>

      <section className="card card-pad" style={{ marginTop: 18 }}>
        <h2>A publicação do sindicato</h2>
        <form action={registrarCubManual} className="grid cub-formulario">
          {voltar ? <input type="hidden" name="voltar" value={voltar} /> : null}

          <div className="grid cub-campos">
            <label>
              Estado
              <select name="uf" defaultValue={uf} required>
                {UFS_DO_BRASIL.map(sigla => (
                  <option key={sigla} value={sigla}>{sigla}</option>
                ))}
              </select>
            </label>

            <label>
              Tipologia
              {/* Agrupada por família e com a descrição junto, pelo mesmo motivo
                  da tela do orçamento: quem orça reconhece "R8-N", raramente
                  "CSL-16A". */}
              <select name="tipologia" required defaultValue="R8-N">
                {tipologiasPorFamilia.map(([familia, itens]) => (
                  <optgroup key={familia} label={ROTULO_DE_FAMILIA[familia]}>
                    {itens.map(item => (
                      <option key={item.codigo} value={item.codigo}>
                        {item.codigo} · {item.descricao}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label>
              Mês de referência
              <input type="month" name="mes" required defaultValue={mesSugerido()} />
            </label>

            <label>
              Regime
              <select name="desonerado" defaultValue="false">
                <option value="false">Sem desoneração</option>
                <option value="true">Com desoneração</option>
              </select>
            </label>
          </div>

          <label>
            CUB por m² (R$)
            <input
              name="total"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              placeholder="1990.11"
              required
            />
          </label>

          <fieldset className="cub-parcelas">
            <legend>Decomposição, se a publicação trouxer</legend>
            {/* Tudo ou nada, e o banco recusa meia decomposição: parcela em
                branco gravada como zero chegaria à tela como "material: R$
                0,00", que é a VACINA-060 outra vez — ausência com cara de
                medição. */}
            <p className="muted" style={{ margin: "0 0 10px" }}>
              Informe as três juntas ou nenhuma. Elas precisam somar o CUB acima, com diferença de no
              máximo um centavo — é o que permite ao orçamento separar material de mão de obra em vez
              de lançar uma linha única.
            </p>
            <div className="grid cub-campos">
              <label>
                Material (R$)
                <input name="material" type="number" min="0" step="0.01" inputMode="decimal" placeholder="900.00" />
              </label>
              <label>
                Mão de obra (R$)
                <input name="maoDeObra" type="number" min="0" step="0.01" inputMode="decimal" placeholder="1040.11" />
              </label>
              <label>
                Despesas administrativas (R$)
                <input name="administrativo" type="number" min="0" step="0.01" inputMode="decimal" placeholder="50.00" />
              </label>
            </div>
          </fieldset>

          <div className="grid cub-campos">
            <label>
              Sindicato que publicou
              <input name="fonte" type="text" maxLength={120} placeholder={`Sinduscon-${uf}`} required />
            </label>
            <label>
              Data da publicação
              <input name="publicacao" type="date" />
            </label>
          </div>

          <label>
            Endereço da publicação
            <input
              name="endereco"
              type="url"
              maxLength={2000}
              placeholder="https://sinduscon-xx.org.br/cub/..."
              required
            />
            <small className="muted">
              Precisa ser <code>https://</code> do site do sindicato. É por onde outra pessoa confere o
              número daqui a seis meses.
            </small>
          </label>

          <label>
            SHA-256 do arquivo (opcional)
            <input name="arquivoSha256" type="text" maxLength={64} pattern="[A-Fa-f0-9]{64}" placeholder="opcional" />
            <small className="muted">
              Fica guardado como <em>declarado</em>. O servidor não baixou o arquivo, então não tem
              como conferir — e registrar isso como se tivesse conferido seria pior que não registrar.
            </small>
          </label>

          <button className="button button-primary" type="submit">Registrar CUB de {uf}</button>
        </form>
      </section>

      <section className="card card-pad" style={{ marginTop: 18 }}>
        <h2>Já registrado em {uf}</h2>
        {jaImportadas.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nenhuma referência para {uf} ainda.
            {estadosComReferencia.length
              ? ` Há referência para ${estadosComReferencia.join(", ")}.`
              : " Nenhum estado tem referência carregada."}
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Referências de CUB já registradas em {uf}</caption>
              <thead>
                <tr>
                  <th scope="col">Tipologia</th>
                  <th scope="col">Mês</th>
                  <th scope="col">Regime</th>
                  <th scope="col" className="numero">CUB por m²</th>
                  <th scope="col">Origem</th>
                </tr>
              </thead>
              <tbody>
                {jaImportadas.map(item => {
                  const manual =
                    (item.raw_payload as { retrievalMode?: string } | null)?.retrievalMode ===
                    "declaracao-manual";
                  return (
                    <tr key={item.id}>
                      <td className="mono">{item.reference_code}</td>
                      <td>{formatarMes(item.base_date)}</td>
                      <td>{item.tax_relief ? "com desoneração" : "sem desoneração"}</td>
                      <td className="numero">{formatCurrency(Number(item.total_cost))}</td>
                      {/* Em texto, não em cor: `UI-UX-PRO-MAX.md` §6. A diferença
                          entre lido e declarado é o que decide quanto confiar no
                          número, e cor sozinha não diz isso a quem não enxerga
                          cor nem a quem imprime. */}
                      <td>
                        {manual ? "Declarado à mão" : "Lido da publicação"} · {item.source_name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
