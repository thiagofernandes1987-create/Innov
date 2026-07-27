import Link from "next/link";
import { notFound } from "next/navigation";
import { PipelineView } from "@/components/pipeline/pipeline-view";
import { hasCapability } from "@/lib/authorization";
import { ROTULO_TRILHA, TRILHAS, type Trilha } from "@/lib/pipeline/domain";
import { carregarPipeline, registrosDisponiveis } from "@/lib/pipeline/server";

export const dynamic = "force-dynamic";

const MODULO_DA_TRILHA: Record<Trilha, string> = {
  cliente: "clientes",
  projeto: "obras",
  assistencia: "sac"
};

const PRESET_DA_TRILHA: Record<Trilha, string> = {
  cliente: "cliente_comercial",
  projeto: "projeto_moveis_planejados",
  assistencia: "assistencia_padrao"
};

const CAMPO_DE_ORIGEM: Record<Trilha, "clientId" | "projectId" | "ticketId"> = {
  cliente: "clientId",
  projeto: "projectId",
  assistencia: "ticketId"
};

const ROTULO_REGISTRO: Record<Trilha, string> = {
  cliente: "Cliente",
  projeto: "Projeto",
  assistencia: "Chamado"
};

export default async function PipelinePage({ params }: { params: Promise<{ trilha: string }> }) {
  const { trilha } = await params;
  if (!(TRILHAS as readonly string[]).includes(trilha)) notFound();
  const trilhaValida = trilha as Trilha;

  const carregado = await carregarPipeline(trilhaValida);
  const podeEditar = await hasCapability(MODULO_DA_TRILHA[trilhaValida], "update");

  // Só busca a lista de registros de quem pode criar cartão: para quem lê, a
  // consulta seria trezentas linhas trafegadas para alimentar um botão que não
  // aparece.
  const campo = CAMPO_DE_ORIGEM[trilhaValida];
  const registros =
    carregado && podeEditar
      ? await registrosDisponiveis(
          trilhaValida,
          carregado.colunas.flatMap(coluna =>
            coluna.cartoes.map(cartao => cartao[campo]).filter((id): id is string => Boolean(id))
          )
        )
      : [];

  return (
    <main className="content pipeline-pagina">
      <section className="page-heading">
        <div>
          <span className="badge">PIPELINE · {ROTULO_TRILHA[trilhaValida].toUpperCase()}</span>
          <h1>{carregado?.pipeline.name ?? ROTULO_TRILHA[trilhaValida]}</h1>
          <p>
            {carregado?.pipeline.descricao ??
              "Onde cada registro está no fluxo, com prazo, marcador e observação."}
          </p>
        </div>
      </section>

      <nav className="pipeline-trilhas" aria-label="Trilhas">
        {TRILHAS.map(item => (
          <Link
            key={item}
            href={`/app/pipeline/${item}`}
            className={item === trilhaValida ? "pipeline-trilha ativa" : "pipeline-trilha"}
            aria-current={item === trilhaValida ? "page" : undefined}
          >
            {ROTULO_TRILHA[item]}
          </Link>
        ))}
      </nav>

      {carregado ? (
        <PipelineView
          trilha={trilhaValida}
          pipelineId={carregado.pipeline.id}
          colunas={carregado.colunas}
          orfaos={carregado.orfaos}
          podeEditar={podeEditar}
          registros={registros}
          rotuloRegistro={ROTULO_REGISTRO[trilhaValida]}
        />
      ) : (
        <section className="card pipeline-sem-trilha">
          <h2>Esta trilha ainda não foi criada</h2>
          <p>
            As etapas não são fixas no sistema: elas são dados da sua organização, e podem ser renomeadas, reordenadas
            ou removidas depois. Comece por um modelo pronto e ajuste ao seu fluxo.
          </p>
          <p className="muted">
            Modelo sugerido: <code>{PRESET_DA_TRILHA[trilhaValida]}</code>. A criação exige permissão de administração.
          </p>
        </section>
      )}
    </main>
  );
}
