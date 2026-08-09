import { Launcher, type AplicativoAutorizado } from "@/components/casca/launcher";
import { getEffectiveApplications } from "@/lib/authorization";
import { loadLauncherSummaries } from "@/lib/casca/launcher-metrics";

export const dynamic = "force-dynamic";

export default async function CentralDeAplicativos() {
  const { context, applications } = await getEffectiveApplications();
  const resumos = await loadLauncherSummaries(context);

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
      <Launcher aplicativos={aplicativos} resumos={resumos} />
    </main>
  );
}
