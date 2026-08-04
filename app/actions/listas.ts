"use server";

// Um módulo "use server" só exporta função assíncrona (VACINA-047): tipo e
// constante ficam em `lib/listas`.
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/authorization";
import { chaveNormalizada } from "@/lib/sugestoes/catalogo";

const ROTA = "/app/administracao/motivos-de-perda";

function texto(dados: FormData, chave: string): string {
  return String(dados.get(chave) ?? "").trim();
}

/**
 * Acrescenta um item à lista do escopo.
 *
 * Nasce **no fim**, e não em ordem alfabética: a lista é curada, e a ordem é
 * decisão de quem curou. Quem quiser o item novo em primeiro sobe com as setas.
 */
export async function criarItemDeLista(dados: FormData): Promise<void> {
  const contexto = await requireCapability("administracao", "manage");
  const escopo = texto(dados, "escopo");
  const rotulo = texto(dados, "rotulo");
  const chave = chaveNormalizada(rotulo);
  if (!escopo || !chave) return;

  const { data: ultimo } = await contexto.supabase
    .from("managed_list_values")
    .select("position")
    .eq("organization_id", contexto.organizationId)
    .eq("scope", escopo)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await contexto.supabase.from("managed_list_values").insert({
    organization_id: contexto.organizationId,
    scope: escopo,
    label: rotulo,
    normalized: chave,
    position: (Number(ultimo?.position) || 0) + 10,
    created_by: contexto.userId
  });
  // Repetido não é erro para quem está cadastrando: o item já existe, que é o
  // resultado que a pessoa queria. Erro seria dizer que falhou.
  if (error && !/duplicate key|unique/i.test(error.message)) {
    console.error("[listas:criar]", error.message);
  }
  revalidatePath(ROTA);
}

/** Renomeia mantendo a mesma linha — histórico que já escolheu este item não muda. */
export async function renomearItemDeLista(dados: FormData): Promise<void> {
  const contexto = await requireCapability("administracao", "manage");
  const id = texto(dados, "id");
  const rotulo = texto(dados, "rotulo");
  const chave = chaveNormalizada(rotulo);
  if (!id || !chave) return;

  const { error } = await contexto.supabase
    .from("managed_list_values")
    .update({ label: rotulo, normalized: chave, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", contexto.organizationId);
  if (error) console.error("[listas:renomear]", error.message);
  revalidatePath(ROTA);
}

/**
 * Tira de circulação — e **não exclui**.
 *
 * Excluir apagaria a opção de registros históricos que a escolheram, e a
 * contagem do trimestre passado mudaria sozinha. Desativado some do formulário
 * e continua no relatório.
 */
export async function alternarItemDeLista(dados: FormData): Promise<void> {
  const contexto = await requireCapability("administracao", "manage");
  const id = texto(dados, "id");
  if (!id) return;

  const { data: atual } = await contexto.supabase
    .from("managed_list_values")
    .select("active")
    .eq("id", id)
    .eq("organization_id", contexto.organizationId)
    .maybeSingle();
  if (!atual) return;

  const { error } = await contexto.supabase
    .from("managed_list_values")
    .update({ active: !atual.active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", contexto.organizationId);
  if (error) console.error("[listas:alternar]", error.message);
  revalidatePath(ROTA);
}

/**
 * Move um item uma posição para cima ou para baixo.
 *
 * A troca é entre vizinhos, e não uma renumeração da lista inteira: renumerar
 * tudo a cada clique faria duas pessoas mexendo ao mesmo tempo embaralharem a
 * ordem uma da outra.
 */
export async function moverItemDeLista(dados: FormData): Promise<void> {
  const contexto = await requireCapability("administracao", "manage");
  const id = texto(dados, "id");
  const direcao = texto(dados, "direcao");
  if (!id || (direcao !== "cima" && direcao !== "baixo")) return;

  const { data: item } = await contexto.supabase
    .from("managed_list_values")
    .select("id, scope, position")
    .eq("id", id)
    .eq("organization_id", contexto.organizationId)
    .maybeSingle();
  if (!item) return;

  const { data: vizinho } = await contexto.supabase
    .from("managed_list_values")
    .select("id, position")
    .eq("organization_id", contexto.organizationId)
    .eq("scope", item.scope)
    [direcao === "cima" ? "lt" : "gt"]("position", item.position)
    .order("position", { ascending: direcao !== "cima" })
    .limit(1)
    .maybeSingle();
  if (!vizinho) return;

  await contexto.supabase
    .from("managed_list_values")
    .update({ position: Number(vizinho.position) })
    .eq("id", item.id)
    .eq("organization_id", contexto.organizationId);
  await contexto.supabase
    .from("managed_list_values")
    .update({ position: Number(item.position) })
    .eq("id", vizinho.id)
    .eq("organization_id", contexto.organizationId);
  revalidatePath(ROTA);
}
