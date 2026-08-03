import { PipelineView } from "@/components/pipeline/pipeline-view";
import { hasCapability } from "@/lib/authorization";
import { requireOrganizationContext } from "@/lib/auth";
import type { Trilha } from "@/lib/pipeline/domain";
import { ESCOPOS, sugestoesDoEscopo } from "@/lib/sugestoes/servidor";
import { carregarPipeline, funisDaTrilha, registrosDisponiveis } from "@/lib/pipeline/server";

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

// Modelos prontos oferecidos ao criar funil. Preset é atalho, não obrigação:
// quem cria "SDR" não deve receber "medição" e "fabricação" dentro.
const PRESETS_DA_TRILHA: Record<Trilha, { chave: string; rotulo: string }[]> = {
  cliente: [{ chave: "cliente_comercial", rotulo: "Comercial (prospecção → ganho)" }],
  projeto: [{ chave: "projeto_moveis_planejados", rotulo: "Móveis planejados (medição → finalizado)" }],
  assistencia: [{ chave: "assistencia_padrao", rotulo: "Assistência (abertura → finalizada)" }]
};

/**
 * A tela de funil, compartilhada.
 *
 * Existe porque o funil é a tela **de trabalho** do aplicativo dono, e não uma
 * rota à parte: a referência do Odoo abre o CRM direto no kanban do pipeline,
 * e foi decisão minha — não do responsável — ter feito `/app/crm` abrir numa
 * página de índice com cards de descrição. O índice virou visão secundária e
 * esta tela passou a ser a inicial do módulo.
 *
 * `/app/pipeline/[trilha]` continua existindo e chamando o mesmo componente:
 * endereço antigo que alguém tenha salvo continua funcionando.
 */
export async function PaginaDeFunil({ trilha: trilhaValida, funil }: { trilha: Trilha; funil?: string }) {

  // O funil escolhido vem da URL; sem escolha, abre o padrão da trilha.
  const carregado = await carregarPipeline(trilhaValida, funil ?? null);
  const podeEditar = await hasCapability(MODULO_DA_TRILHA[trilhaValida], "update");
  const funis = carregado ? await funisDaTrilha(trilhaValida) : [];

  // Vocabulário de etapas da organização. Só para quem pode editar: quem lê não
  // cria coluna, e a consulta seria tráfego para alimentar um campo que não
  // aparece — mesmo critério já usado para a lista de registros logo abaixo.
  const { supabase, organizationId } = await requireOrganizationContext();
  const sugestoesDeEtapa = carregado && podeEditar
    ? await sugestoesDoEscopo(supabase, organizationId, ESCOPOS.etapaDoFunil)
    : [];

  // Projeto e chamado nascem presos a um cliente, então o formulário de
  // cadastro precisa da lista mesmo fora da trilha de cliente.
  const clientes =
    carregado && podeEditar && trilhaValida !== "cliente" ? await registrosDisponiveis("cliente", []) : [];

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
    <main className="content-largo pipeline-pagina">
      {/* Sem título de página. As trilhas viraram os menus do módulo na barra
          superior e o nome da trilha vive na barra de controle, ao lado do
          botão de criar — é o que o responsável marcou: "precisa ser mais
          clean, não precisaria desse título aqui". O `h1` continua existindo
          como nome acessível da tela, em corpo de texto, dentro da barra. */}
      {carregado ? (
        <PipelineView
          trilha={trilhaValida}
          pipelineId={carregado.pipeline.id}
          colunas={carregado.colunas}
          orfaos={carregado.orfaos}
          podeEditar={podeEditar}
          registros={registros}
          clientes={trilhaValida === "cliente" ? registros : clientes}
          rotuloRegistro={ROTULO_REGISTRO[trilhaValida]}
          funis={funis}
          sugestoesDeEtapa={sugestoesDeEtapa}
          funilAtual={
            funis.find(item => item.id === carregado.pipeline.id) ?? {
              id: carregado.pipeline.id,
              key: carregado.pipeline.key,
              name: carregado.pipeline.name,
              padrao: true
            }
          }
          presets={PRESETS_DA_TRILHA[trilhaValida]}
        />
      ) : (
        <section className="card pipeline-sem-trilha">
          <h1>Esta trilha ainda não foi criada</h1>
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
