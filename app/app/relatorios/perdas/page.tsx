import Link from "next/link";
import { ReportNavigation } from "@/components/reports/report-navigation";
import { requireCapability } from "@/lib/authorization";
import { DATA_LOAD_ERROR_MESSAGE, reportDataAccessError } from "@/lib/errors/data-access";
import { listaDoEscopo } from "@/lib/listas/servidor";
import { classificacaoUtil, motivosSemUso, pareto, totalPerdido, type LinhaDePareto } from "@/lib/relatorios/perdas";
import { ESCOPOS } from "@/lib/sugestoes/servidor";

export const dynamic = "force-dynamic";

// Perdas por motivo — o Pareto do funil.
//
// É a razão de a lista de motivos ser curada. Sem este relatório, a curadoria
// cobra trabalho de quem administra e não devolve nada; com ele, "onde estamos
// perdendo?" tem resposta com número em vez de impressão.
//
// **Ordena por valor, não por contagem** (`lib/relatorios/perdas.ts`), e a
// classificação A/B/C segue a tabela canônica de `QUALIDADE-CAUSA-RAIZ.md` §2 —
// a mesma leitura que o Pareto da qualidade usa, para quem lê os dois não
// precisar aprender duas convenções.

const PERIODOS = [
  ["90", "Últimos 90 dias"],
  ["180", "Últimos 6 meses"],
  ["365", "Últimos 12 meses"],
  ["0", "Todo o histórico"]
] as const;

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const percentual = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;

function inicioDoPeriodo(dias: number): string | null {
  if (dias <= 0) return null;
  return new Date(Date.now() - dias * 86_400_000).toISOString();
}

export default async function RelatorioDePerdasPage({
  searchParams
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const contexto = await requireCapability("relatorios", "read");
  const { periodo } = await searchParams;
  const dias = PERIODOS.some(([v]) => v === periodo) ? Number(periodo) : 365;
  const desde = inicioDoPeriodo(dias);

  let consulta = contexto.supabase
    .from("opportunities")
    .select("id, lost_reason, estimated_value, closed_at")
    .eq("organization_id", contexto.organizationId)
    .eq("stage", "LOST");
  if (desde) consulta = consulta.gte("closed_at", desde);

  const [resultado, cadastrados] = await Promise.all([
    consulta,
    listaDoEscopo(contexto.supabase, contexto.organizationId, ESCOPOS.motivoDePerda, { apenasAtivos: false })
  ]);
  reportDataAccessError("relatorio-perdas.oportunidades", resultado.error);

  const linhas = pareto(
    (resultado.data ?? []).map(o => ({
      motivo: o.lost_reason,
      valor: Number(o.estimated_value) || 0
    }))
  );
  const total = totalPerdido(linhas);
  const semUso = motivosSemUso(cadastrados, linhas);
  const classeA = linhas.filter((l: LinhaDePareto) => l.classe === "A");
  // ABC pressupõe cauda longa; com poucos motivos ela mente, e some.
  const mostrarClasse = classificacaoUtil(linhas);

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <span className="badge">FUNIL COMERCIAL</span>
          <h1>Perdas por motivo</h1>
          <p>
            Onde a empresa está perdendo negócio, ordenado por valor. A lista de motivos é cadastrada
            em <Link href="/app/administracao/motivos-de-perda">Administração</Link>.
          </p>
        </div>
      </section>
      <ReportNavigation />

      {resultado.error ? (
        <div className="validation blocking" role="alert">{DATA_LOAD_ERROR_MESSAGE}</div>
      ) : null}

      <form className="card card-pad report-filter" method="get" style={{ marginTop: 18 }}>
        <label>Período
          <select name="periodo" defaultValue={String(dias)}>
            {PERIODOS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
          </select>
        </label>
        <button className="button button-secondary" type="submit">Aplicar</button>
      </form>

      <section className="grid grid-kpi" style={{ marginTop: 18 }}>
        <article className="card kpi"><small>NEGÓCIOS PERDIDOS</small><strong>{total.negocios}</strong></article>
        <article className="card kpi"><small>VALOR PERDIDO</small><strong>{moeda.format(total.valor)}</strong></article>
        <article className="card kpi"><small>MOTIVOS DISTINTOS</small><strong>{linhas.length}</strong></article>
        {/* O cartão muda com o tamanho da amostra, pela mesma razão que a
            coluna Classe some: "1 de 2 concentram 80%" é aritmeticamente
            verdadeiro e não informa nada. Com poucos motivos, o que interessa é
            qual é o maior e quanto ele pesa. */}
        {mostrarClasse ? (
          <article className="card kpi">
            <small>CONCENTRAM 80% DA PERDA</small>
            <strong>{classeA.length} de {linhas.length}</strong>
          </article>
        ) : (
          <article className="card kpi">
            <small>MAIOR MOTIVO</small>
            <strong>{linhas.length ? percentual(linhas[0].fatia) : "—"}</strong>
          </article>
        )}
      </section>

      {mostrarClasse && classeA.length && linhas.length > classeA.length ? (
        <p className="muted" style={{ marginTop: 12 }}>
          <strong>{classeA.length} de {linhas.length} motivos</strong> concentram 80% do valor
          perdido. É por onde começar — resolver os demais primeiro custa o mesmo e devolve menos.
        </p>
      ) : null}

      <section className="card table-wrap" style={{ marginTop: 18 }}>
        <table>
          <thead>
            <tr>
              <th>Motivo</th>
              <th style={{ textAlign: "right" }}>Negócios</th>
              <th style={{ textAlign: "right" }}>Valor perdido</th>
              <th style={{ textAlign: "right" }}>%</th>
              <th style={{ textAlign: "right" }}>Acum.</th>
              {mostrarClasse ? <th>Classe</th> : null}
            </tr>
          </thead>
          <tbody>
            {linhas.map(linha => (
              <tr key={linha.motivo}>
                <td><strong>{linha.motivo}</strong></td>
                <td style={{ textAlign: "right" }}>{linha.negocios}</td>
                <td style={{ textAlign: "right" }}>{moeda.format(linha.valor)}</td>
                <td style={{ textAlign: "right" }}>{percentual(linha.fatia)}</td>
                <td style={{ textAlign: "right" }}>{percentual(linha.acumulado)}</td>
                {mostrarClasse ? (
                  <td>
                    <span className={linha.classe === "A" ? "badge badge-danger" : linha.classe === "B" ? "badge badge-warning" : "badge"}>
                      {linha.classe}
                    </span>
                  </td>
                ) : null}
              </tr>
            ))}
            {!linhas.length ? (
              <tr><td colSpan={mostrarClasse ? 6 : 5}><div className="empty-state">
                <h2>Nenhum negócio perdido no período</h2>
                <p>
                  Ou não houve perda, ou o período é curto demais para mostrar. O relatório se forma
                  sozinho conforme o funil for sendo trabalhado.
                </p>
              </div></td></tr>
            ) : null}
          </tbody>
        </table>
      </section>

      {semUso.length ? (
        <section className="card card-pad" style={{ marginTop: 22 }}>
          <h2>Motivos que ninguém escolheu no período</h2>
          {/* O outro lado do relatório. Motivo que ninguém escolhe em doze meses
              ou não descreve a realidade da empresa, ou está escrito de um jeito
              que ninguém reconhece — nos dois casos a lista pede revisão, e sem
              esta seção ninguém descobre, porque o que não aparece não chama
              atenção. */}
          <p className="muted">
            Ou não acontecem, ou estão escritos de um jeito que ninguém reconhece na hora de
            escolher. Vale revisar em{" "}
            <Link href="/app/administracao/motivos-de-perda">Administração → Motivos de perda</Link>.
          </p>
          <ul style={{ marginTop: 12 }}>
            {semUso.map(motivo => <li key={motivo}>{motivo}</li>)}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
