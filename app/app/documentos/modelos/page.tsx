import { EditorDeModelo } from "@/components/documentos/editor-de-modelo";
import { requireCapability } from "@/lib/authorization";

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
// Primeiro corte do motor aprovado em 2 de agosto: corpo, variáveis e
// pré-visualização. A gravação em `document_templates` — que já existe, com RLS
// pela permissão do módulo — entra na próxima tarefa; esta tela prova o motor
// com o modelo de exemplo e é onde a pré-visualização é conferida.
export default async function ModelosDeDocumentoPage() {
  await requireCapability("documentos", "read");
  return (
    <main className="content-largo">
      <section className="page-heading">
        <h1>Modelos de documento</h1>
        <p>
          Um modelo serve a todos os módulos que emitem documento. O corpo é Markdown, as variáveis são
          escolhidas na lista, e a pré-visualização usa um registro de exemplo.
        </p>
      </section>
      <EditorDeModelo funcao="PROPOSTA" corpoInicial={EXEMPLO} />
    </main>
  );
}
