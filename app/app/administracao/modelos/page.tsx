import { MatrizDeDisponibilizacao } from "@/components/documentos/matriz-de-disponibilizacao";
import { requireCapability } from "@/lib/authorization";
import { MODULE_REGISTRY, type ModuleManifest } from "@/lib/modules/registry";
import { SUGESTAO_POR_APLICATIVO } from "@/lib/documentos/tipos";

export const dynamic = "force-dynamic";

// Disponibilização: quais tipos de documento cada aplicativo oferece.
//
// É o pedido literal do responsável: *"eu em administração posso escolher quais
// arquivos cada app pode disponibilizar para o usuário com checks"*. E é **por
// empresa**: a marcação vive em `document_module_types` com `organization_id`.
//
// Vale dizer o que isto **não** é. Não é permissão. Quem pode ler a biblioteca
// é quem tem acesso ao aplicativo de modelos, e desmarcar um tipo aqui não
// esconde nada de quem for procurar direto na biblioteca. O que isto faz é
// decidir o que aparece na lista de dentro de cada aplicativo — para quem
// emite ordem de serviço em Obras não escolher entre trinta e cinco tipos
// quando os que ele usa ali são quatro.
export default async function DisponibilizacaoDeModelosPage() {
  const context = await requireCapability("administracao", "manage");

  const { data } = await context.supabase
    .from("document_module_types")
    .select("module_key, document_type")
    .eq("organization_id", context.organizationId);

  const marcados = new Map<string, string[]>();
  for (const linha of data ?? []) {
    const chave = String(linha.module_key);
    marcados.set(chave, [...(marcados.get(chave) ?? []), String(linha.document_type)]);
  }

  const aplicativos = MODULE_REGISTRY.filter(
    (m: ModuleManifest) => m.key !== "modelos" && m.key !== "auditoria" && m.key !== "administracao"
  ).map(
    (m: ModuleManifest) => ({
      chave: m.key,
      nome: m.name,
      categoria: m.category,
      selecionados: marcados.get(m.key) ?? [...(SUGESTAO_POR_APLICATIVO[m.key] ?? [])],
      // Sem marcação gravada, a tela mostra a sugestão do catálogo — e diz que
      // é sugestão. Apresentar sugestão como decisão faria o administrador
      // achar que já configurou.
      configurado: marcados.has(m.key)
    })
  );

  return (
    <main className="content-largo">
      <section className="page-heading">
        <h1>Disponibilização de modelos</h1>
        <p>
          Marque quais tipos de documento cada aplicativo oferece a quem usa. A biblioteca é uma só e
          continua sendo lida por todos — isto decide <strong>o que aparece na lista</strong> de cada
          aplicativo, não quem pode ver. A marcação vale para esta empresa.
        </p>
      </section>
      <MatrizDeDisponibilizacao aplicativos={aplicativos} />
    </main>
  );
}
