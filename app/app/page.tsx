import { Launcher, type AplicativoAutorizado } from "@/components/casca/launcher";
import { getEffectiveApplications } from "@/lib/authorization";
import { carregarIndicadores } from "@/lib/casca/indicadores";

export const dynamic = "force-dynamic";

export default async function CentralDeAplicativos() {
  const [{ applications }, indicadores] = await Promise.all([
    getEffectiveApplications(),
    carregarIndicadores()
  ]);

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

  const resumos = await loadLauncherSummaries(context);

  return (
    <main className="content pagina-launcher">
      <Launcher aplicativos={aplicativos} indicadores={indicadores} />
    </main>
  );
}
