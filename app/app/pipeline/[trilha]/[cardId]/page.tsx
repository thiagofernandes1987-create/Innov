import { notFound } from "next/navigation";
import { CartaoCompleto } from "@/components/pipeline/cartao-completo";
import { hasCapability } from "@/lib/authorization";
import { TRILHAS, type Trilha } from "@/lib/pipeline/domain";
import { carregarCartao } from "@/lib/pipeline/server";

export const dynamic = "force-dynamic";

export default async function CartaoPage({
  params
}: {
  params: Promise<{ trilha: string; cardId: string }>;
}) {
  const { trilha, cardId } = await params;
  if (!(TRILHAS as readonly string[]).includes(trilha)) notFound();

  const carregado = await carregarCartao(cardId);
  if (!carregado || carregado.cartao.trilha !== trilha) notFound();

  const podeEditar = await hasCapability(carregado.pipeline.moduleKey, "update");

  return (
    <main className="content-largo pipeline-pagina">
      {/* Sem cabeçalho de página: o formulário já abre com o nome do registro,
          e repetir o mesmo texto duas vezes na mesma tela era exatamente o
          "não precisaria desse título aqui" da captura. O `h1` mora dentro do
          formulário, onde o nome do registro é conteúdo e não moldura. */}
      <CartaoCompleto
        trilha={trilha as Trilha}
        cartao={carregado.cartao}
        etapas={carregado.etapas}
        datasDaEtapa={carregado.datasDaEtapa}
        cliente={carregado.cliente}
        projetos={carregado.projetos}
        documentos={carregado.documentos}
        chamados={carregado.chamados}
        observacoes={carregado.observacoes}
        historico={carregado.historico}
        atividades={carregado.atividades}
        autores={carregado.autores}
        telefone={carregado.telefone}
        responsavel={carregado.responsavel}
        seguidores={carregado.seguidores}
        euSigo={carregado.euSigo}
        pessoas={carregado.pessoas}
        podeEditar={podeEditar}
      />
    </main>
  );
}
