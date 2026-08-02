import { notFound } from "next/navigation";
import { PaginaDeFunil } from "@/components/pipeline/pagina-de-funil";
import { TRILHAS, type Trilha } from "@/lib/pipeline/domain";

export const dynamic = "force-dynamic";

// Endereço histórico do funil. Continua válido e delega para o componente
// compartilhado — quem salvou o link não perde a tela.
export default async function PipelinePage({
  params,
  searchParams
}: {
  params: Promise<{ trilha: string }>;
  searchParams: Promise<{ funil?: string }>;
}) {
  const { trilha } = await params;
  const { funil } = await searchParams;
  if (!(TRILHAS as readonly string[]).includes(trilha)) notFound();
  return <PaginaDeFunil trilha={trilha as Trilha} funil={funil} />;
}
