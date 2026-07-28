import { Launcher, type AplicativoAutorizado } from "@/components/casca/launcher";
import { getEffectiveApplications } from "@/lib/authorization";

export const dynamic = "force-dynamic";

// Tela inicial: a grade de aplicativos que o perfil libera.
//
// É aqui que "plug and play" fica visível. Liberar um módulo para um perfil faz
// o ícone aparecer nesta tela para quem tem aquele perfil, sem tocar em código
// de navegação — porque a navegação é a consulta, não uma lista escrita à mão.

export default async function CentralDeAplicativos() {
  const { applications } = await getEffectiveApplications();

  const aplicativos: AplicativoAutorizado[] = applications
    .filter(item => item.applicationKey !== "dashboard" && item.accessLevel !== "NONE")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(item => ({
      chave: item.applicationKey,
      nome: item.name,
      descricao: item.description,
      categoria: item.category,
      href: item.routePrefix,
      nivel: item.accessLevel
    }));

  return (
    <main className="content pagina-launcher">
      <Launcher aplicativos={aplicativos} />
    </main>
  );
}
