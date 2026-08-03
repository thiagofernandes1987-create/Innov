"use server";

// Um módulo "use server" só exporta função assíncrona (VACINA-047): tipo e
// constante ficam em `lib/sugestoes`.
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/authorization";
import { chaveNormalizada } from "@/lib/sugestoes/catalogo";

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
  const chave = chaveNormalizada(valor);
  if (!escopo || !chave) return;

  const { error } = await contexto.supabase.rpc("limpar_valor_do_catalogo", {
    p_organization_id: contexto.organizationId,
    p_scope: escopo,
    p_normalized: chave
  });
  if (error) console.error("[sugestoes:limpar]", error.message ?? error);
  revalidatePath(ROTA);
}
