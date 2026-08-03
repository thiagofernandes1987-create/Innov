import { EditorDeModelo } from "@/components/documentos/editor-de-modelo";
import { requireCapability } from "@/lib/authorization";
import { FUNCOES, funcoesDoModulo, moduloDaFuncao, rotuloDaFuncao } from "@/lib/documentos/funcoes";

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

- Início previsto: {{obra.inicio_previsto}}
- Término previsto: {{obra.termino_previsto}}

> Dúvidas: {{cliente.email_comercial}}

---

Atenciosamente,
{{sistema.autor}}
`;

// Tela de modelo de documento.
//
// A permissão é a do **módulo dono da função** — propostas, contratos,
// qualidade —, não a de um aplicativo "documentos" genérico. É a decisão que a
// migration registrou ao guardar `module_key` na linha: a RLS reaproveita
// `has_module_permission` em vez de criar uma segunda régua de acesso.
//
// O explorador lista os modelos reais daquele módulo, agrupados pela função,
// porque um módulo tem mais de uma: qualidade tem FVS, FVM e laudo.
export default async function ModelosDeDocumentoPage({
  searchParams
}: {
  searchParams: Promise<{ funcao?: string; modelo?: string }>;
}) {
  const parametros = await searchParams;
  const funcao = FUNCOES.some(f => f.funcao === parametros.funcao) ? parametros.funcao! : "PROPOSTA";
  const moduleKey = moduloDaFuncao(funcao)!;
  const context = await requireCapability(moduleKey, "read");

  const { data } = await context.supabase
    .from("document_templates")
    .select("id, name, purpose, status, version_number, updated_at, body_markdown")
    .eq("organization_id", context.organizationId)
    .eq("module_key", moduleKey)
    .is("archived_at", null)
    .order("purpose")
    .order("name");

  const modelos = data ?? [];
  const aberto = parametros.modelo ? modelos.find(m => m.id === parametros.modelo) ?? null : null;

  const pastas = funcoesDoModulo(moduleKey).map(f => ({
    pasta: rotuloDaFuncao(f.funcao),
    funcao: f.funcao,
    itens: modelos
      .filter(m => m.purpose === f.funcao)
      .map(m => ({
        id: String(m.id),
        nome: String(m.name),
        status: String(m.status),
        aberto: m.id === aberto?.id
      }))
  }));

  return (
    <main className="content-largo">
      <section className="page-heading">
        <h1>Modelos de documento</h1>
        <p>
          Um modelo serve a todos os módulos que emitem documento. O corpo é Markdown, as variáveis são
          escolhidas na lista, e a pré-visualização usa um registro de exemplo. Rascunho é do autor;
          publicado passa a valer para quem emite documento de {rotuloDaFuncao(funcao).toLowerCase()}.
        </p>
      </section>
      <EditorDeModelo
        funcao={funcao}
        modeloId={aberto ? String(aberto.id) : null}
        nomeInicial={aberto ? String(aberto.name) : ""}
        versaoInicial={aberto ? Number(aberto.version_number) : 0}
        statusInicial={aberto ? (String(aberto.status) as "DRAFT" | "PUBLISHED") : null}
        corpoInicial={aberto ? String(aberto.body_markdown) : EXEMPLO}
        pastas={pastas}
      />
    </main>
  );
}
