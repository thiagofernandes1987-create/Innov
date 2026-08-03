import Link from "next/link";
import { PainelDeEmissao } from "@/components/documentos/painel-de-emissao";
import { requireCapability } from "@/lib/authorization";
import { modelosDisponiveis } from "@/lib/documentos/biblioteca";
import { rotuloDoTipo } from "@/lib/documentos/tipos";

export const dynamic = "force-dynamic";

// Emissão de documento a partir de um modelo.
//
// Duas garantias que esta tela existe para tornar visíveis:
//
//   **o dicionário respeita a RLS de quem gera** — as listas abaixo saem do
//   cliente da sessão, então quem não pode ler um cliente não o encontra aqui e
//   não consegue colocá-lo num documento;
//
//   **o documento guarda o texto resolvido** — depois de emitido, ele não muda
//   se o modelo mudar. É o que a lista de emitidos mostra: cada linha é o que
//   saiu naquele dia, não uma releitura do molde de hoje.
export default async function EmitirDocumentoPage({
  searchParams
}: {
  searchParams: Promise<{ modelo?: string }>;
}) {
  const parametros = await searchParams;
  const context = await requireCapability("modelos", "read");

  // Só modelo publicado gera documento: rascunho é trabalho em andamento de
  // alguém, e emitir a partir dele mandaria para o cliente um texto que ninguém
  // aprovou.
  const modelos = await modelosDisponiveis(context.supabase, context.organizationId, {
    somentePublicados: true
  });

  const [clientes, obras, orcamentos, propostas, emitidos] = await Promise.all([
    context.supabase.from("clients").select("id, legal_name, trade_name").is("archived_at", null).order("legal_name").limit(200),
    context.supabase.from("projects").select("id, code, name").is("archived_at", null).order("code").limit(200),
    context.supabase.from("budgets").select("id, code, title").order("code", { ascending: false }).limit(200),
    context.supabase.from("proposals").select("id, code").order("code", { ascending: false }).limit(200),
    context.supabase
      .from("emitted_documents")
      .select("id, title, template_name, document_type, emitted_at, sha256, gaps")
      .order("emitted_at", { ascending: false })
      .limit(15)
  ]);

  const lista = (emitidos.data ?? []).map(d => ({
    id: String(d.id),
    titulo: String(d.title),
    modelo: String(d.template_name),
    tipo: rotuloDoTipo(String(d.document_type)),
    quando: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(String(d.emitted_at))),
    impressao: String(d.sha256).slice(0, 12),
    lacunas: Array.isArray(d.gaps) ? d.gaps.length : 0
  }));

  return (
    <main className="content-largo">
      <section className="page-heading">
        <h1>Emitir documento</h1>
        <p>
          Escolha o modelo e os registros. O que aparece nas listas é o que <strong>você</strong> pode ler —
          o documento não é caminho para contornar permissão. O texto gerado fica gravado como saiu:
          não muda se o modelo mudar depois.
        </p>
        <p>
          <Link className="link-de-volta" href="/app/modelos">Voltar para a biblioteca</Link>
        </p>
      </section>

      <PainelDeEmissao
        modeloInicial={parametros.modelo ?? null}
        modelos={modelos.map(m => ({ id: m.id, nome: m.nome, tipo: m.rotuloDoTipo }))}
        clientes={(clientes.data ?? []).map(c => ({ id: String(c.id), nome: String(c.trade_name || c.legal_name) }))}
        obras={(obras.data ?? []).map(o => ({ id: String(o.id), nome: `${o.code ?? ""} ${o.name ?? ""}`.trim() }))}
        orcamentos={(orcamentos.data ?? []).map(o => ({ id: String(o.id), nome: `${o.code ?? ""} ${o.title ?? ""}`.trim() }))}
        propostas={(propostas.data ?? []).map(p => ({ id: String(p.id), nome: String(p.code ?? p.id) }))}
      />

      <section className="card-pad">
        <h2>Emitidos recentemente</h2>
        {lista.length === 0 ? (
          <p className="muted">Nenhum documento emitido ainda.</p>
        ) : (
          <div className="tabela-rolante">
            <table>
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Modelo</th>
                  <th>Quando</th>
                  <th>Lacunas</th>
                  <th>Impressão</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(d => (
                  <tr key={d.id}>
                    <td>{d.titulo}</td>
                    <td>{d.tipo}</td>
                    <td>{d.modelo}</td>
                    <td>{d.quando}</td>
                    <td>{d.lacunas > 0 ? `${d.lacunas}` : "—"}</td>
                    <td><code>{d.impressao}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted">
          A impressão é o início do SHA-256 do texto gravado. Serve para provar que o documento não
          foi alterado depois — e é por isso que a tabela não aceita edição nem exclusão: corrigir um
          documento emitido é emitir outro.
        </p>
      </section>
    </main>
  );
}
