import { notFound } from "next/navigation";
import { CartaoCompleto } from "@/components/pipeline/cartao-completo";
import { hasCapability } from "@/lib/authorization";
import { ROTULO_TRILHA, TRILHAS, type Trilha } from "@/lib/pipeline/domain";
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
    <main className="content pipeline-pagina">
      <section className="page-heading">
        <div>
          <span className="badge">
            {ROTULO_TRILHA[trilha as Trilha].toUpperCase()} · {carregado.pipeline.name.toUpperCase()}
          </span>
          <h1>{carregado.cartao.titulo}</h1>
          <p>{carregado.cartao.subtitulo ?? "Sem cliente vinculado"}</p>
        </div>
      </section>

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
        podeEditar={podeEditar}
      />
    </main>
  );
}
