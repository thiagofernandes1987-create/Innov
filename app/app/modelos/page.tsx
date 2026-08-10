import { EditorDeModelo } from "@/components/documentos/editor-de-modelo";
import { requireCapability } from "@/lib/authorization";
import { modelosDisponiveis } from "@/lib/documentos/biblioteca";
import { ROTULO_CATEGORIA, TIPOS, categorias, tipo as tipoDoCatalogo } from "@/lib/documentos/tipos";
import { TrazerPadroes } from "@/components/documentos/trazer-padroes";

export const dynamic = "force-dynamic";

const EXEMPLO = `# Proposta comercial {{proposta.numero}}

**{{empresa.razao_social}}** — CNPJ {{empresa.cnpj}}
{{sistema.hoje}}

Prezado(a) **{{cliente.nome_completo}}**,

Segue proposta para a obra *{{obra.nome}}*, situada em {{obra.endereco}}.

| Item | Valor |
|---|---|
| Orçamento {{orcamento.codigo}} | {{orcamento.valor_total}} |
| Validade | {{orcamento.validade}} |

> Dúvidas: {{cliente.email_comercial}}

---

Atenciosamente,
{{sistema.autor}}
`;

// Modelos e Documentações — a biblioteca da empresa.
//
// **Uma tabela, um aplicativo, todo módulo lê.** O explorador mostra o acervo
// inteiro agrupado por categoria e tipo, com a origem marcada: o que vem da
// plataforma vale para todas as empresas e não é editável aqui — duplica-se.
//
// A permissão é a do aplicativo `modelos`. O que a Administração marca em
// `/app/administracao/modelos` decide o que cada **outro** aplicativo oferece,
// não o que aparece nesta tela: quem administra a biblioteca vê a biblioteca
// inteira.
export default async function BibliotecaDeModelosPage({
  searchParams
}: {
  searchParams: Promise<{ tipo?: string; modelo?: string }>;
}) {
  const parametros = await searchParams;
  const context = await requireCapability("modelos", "read");

  const modelos = await modelosDisponiveis(context.supabase, context.organizationId);
  const aberto = parametros.modelo ? modelos.find(m => m.id === parametros.modelo) ?? null : null;

  const tipoAtual = aberto?.tipo ?? (tipoDoCatalogo(parametros.tipo ?? "") ? parametros.tipo! : "PROPOSTA");

  let corpoInicial = EXEMPLO;
  let nomeInicial = "";
  let versaoInicial = 0;
  let statusInicial: "DRAFT" | "PUBLISHED" | null = null;
  let clienteVeInicial = false;
  let escopoInicial: "PLATAFORMA" | "ORGANIZACAO" = "ORGANIZACAO";

  if (aberto) {
    const { data } = await context.supabase
      .from("document_templates")
      .select("body_markdown")
      .eq("id", aberto.id)
      .maybeSingle();
    corpoInicial = String(data?.body_markdown ?? "");
    nomeInicial = aberto.nome;
    versaoInicial = aberto.versao;
    statusInicial = aberto.status === "ARCHIVED" ? null : aberto.status;
    clienteVeInicial = aberto.clienteVe;
    escopoInicial = aberto.escopo;
  }

  // Agrupado por categoria e depois por tipo: é como o responsável descreveu a
  // organização — "os módulos organizam por tipo".
  const pastas = categorias().flatMap(categoria => {
    const daCategoria = TIPOS.filter(t => t.categoria === categoria);
    const comModelos = daCategoria.filter(t => modelos.some(m => m.tipo === t.chave));
    // Categoria sem nenhum modelo não vira pasta vazia: ocuparia a coluna toda
    // com sete títulos e nada embaixo.
    if (comModelos.length === 0) return [];
    return [
      {
        pasta: ROTULO_CATEGORIA[categoria],
        chave: categoria,
        grupos: comModelos.map(t => ({
          tipo: t.chave,
          rotulo: t.rotulo,
          itens: modelos
            .filter(m => m.tipo === t.chave)
            .map(m => ({
              id: m.id,
              nome: m.nome,
              status: m.status,
              escopo: m.escopo,
              clienteVe: m.clienteVe,
              aberto: m.id === aberto?.id
            }))
        }))
      }
    ];
  });

  return (
    <main className="content-largo">
      <section className="page-heading">
        <h1>Modelos e Documentações</h1>
        <p>
          Uma biblioteca só, lida por todos os aplicativos: proposta, contrato, termo, mensagem de funil,
          lembrete, e-mail. O tipo é como cada aplicativo organiza o que oferece — e quem decide o que
          aparece em cada um é a <strong>Administração</strong>, com os checks de disponibilização.
        </p>
        <TrazerPadroes />
      </section>
      <EditorDeModelo
        tipo={tipoAtual}
        modeloId={aberto?.id ?? null}
        nomeInicial={nomeInicial}
        versaoInicial={versaoInicial}
        statusInicial={statusInicial}
        clienteVeInicial={clienteVeInicial}
        escopoInicial={escopoInicial}
        corpoInicial={corpoInicial}
        pastas={pastas}
      />
    </main>
  );
}
