"use server";

// Um módulo "use server" só exporta função assíncrona (VACINA-047): tipo e
// constante ficam em `lib/sugestoes`.
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/authorization";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { chaveDoEscopo } from "@/lib/sugestoes/catalogo";

const ROTA = "/app/administracao/vocabulario";

/**
 * Remove um valor do vocabulário da organização.
 *
 * **Não altera nenhum registro já gravado.** A etapa de EAP que se chama
 * "Fundacao" continua se chamando assim; o que sai é a sugestão. Confundir as
 * duas coisas seria dar ao administrador um botão que ele acha que corrige o
 * histórico — e não corrige.
 *
 * A autorização é dupla, de propósito: `requireCapability` barra a tela, e
 * `limpar_valor_do_catalogo` confere de novo no banco. Guarda só na tela protege
 * a tela, não o dado.
 */
export async function limparValorDoCatalogo(formData: FormData): Promise<void> {
  const contexto = await requireCapability("administracao", "manage");
  const escopo = String(formData.get("escopo") ?? "").trim();
  const valor = String(formData.get("valor") ?? "").trim();
  // A chave depende do escopo: em unidade de medida, `m²` e `m2` são a mesma
  // linha, e limpar uma tem de limpar a certa.
  const chave = chaveDoEscopo(escopo, valor);
  if (!escopo || !chave) return;

  const { error } = await contexto.supabase.rpc("limpar_valor_do_catalogo", {
    p_organization_id: contexto.organizationId,
    p_scope: escopo,
    p_normalized: chave
  });
  reportDataAccessError("sugestoes.clear-catalog-value", error);
  revalidatePath(ROTA);
}