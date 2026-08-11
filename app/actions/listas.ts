"use server";

// Um módulo "use server" só exporta função assíncrona (VACINA-047): tipo e
// constante ficam em `lib/listas`.
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/authorization";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { chaveNormalizada } from "@/lib/sugestoes/catalogo";
import { campoDeTexto } from "@/lib/forms/campos";

const ROTA = "/app/administracao/motivos-de-perda";

function texto(dados: FormData, chave: string): string {
  return campoDeTexto(dados, chave).trim();
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

  const { data: ultimo, error: ultimoError } = await contexto.supabase
    .from("managed_list_values")
    .select("position")
    .eq("organization_id", contexto.organizationId)
    .eq("scope", escopo)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ultimoError) reportDataAccessError("listas.load-last-position", ultimoError);

  const { error } = await contexto.supabase.from("managed_list_values").insert({
    organization_id: contexto.organizationId,
    scope: escopo,
    label: rotulo,
    normalized: chave,
    position: (Number(ultimo?.position) || 0) + 10,
    created_by: contexto.userId
  });
  // Repetido não é erro para quem está cadastrando: o item já existe, que é o
  // resultado que a pessoa queria. Erro seria dizer que falhou. Use o código
  // estável do PostgreSQL em vez de depender do texto/localização da mensagem.
  if (error && error.code !== "23505") {
    reportDataAccessError("listas.create", error);
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
  reportDataAccessError("listas.rename", error);
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

  const { data: atual, error: atualError } = await contexto.supabase
    .from("managed_list_values")
    .select("active")
    .eq("id", id)
    .eq("organization_id", contexto.organizationId)
    .maybeSingle();
  if (atualError) {
    reportDataAccessError("listas.load-current", atualError);
    return;
  }
  if (!atual) return;

  const { error } = await contexto.supabase
    .from("managed_list_values")
    .update({ active: !atual.active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", contexto.organizationId);
  reportDataAccessError("listas.toggle", error);
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

  const { data: item, error: itemError } = await contexto.supabase
    .from("managed_list_values")
    .select("id, scope, position")
    .eq("id", id)
    .eq("organization_id", contexto.organizationId)
    .maybeSingle();
  if (itemError) {
    reportDataAccessError("listas.load-item", itemError);
    return;
  }
  if (!item) return;

  const { data: vizinho, error: vizinhoError } = await contexto.supabase
    .from("managed_list_values")
    .select("id, position")
    .eq("organization_id", contexto.organizationId)
    .eq("scope", item.scope)
    [direcao === "cima" ? "lt" : "gt"]("position", item.position)
    .order("position", { ascending: direcao !== "cima" })
    .limit(1)
    .maybeSingle();
  if (vizinhoError) {
    reportDataAccessError("listas.load-neighbor", vizinhoError);
    return;
  }
  if (!vizinho) return;

  const { error: itemUpdateError } = await contexto.supabase
    .from("managed_list_values")
    .update({ position: Number(vizinho.position) })
    .eq("id", item.id)
    .eq("organization_id", contexto.organizationId);
  if (itemUpdateError) {
    reportDataAccessError("listas.move-item", itemUpdateError);
    return;
  }
  const { error: neighborUpdateError } = await contexto.supabase
    .from("managed_list_values")
    .update({ position: Number(item.position) })
    .eq("id", vizinho.id)
    .eq("organization_id", contexto.organizationId);
  reportDataAccessError("listas.move-neighbor", neighborUpdateError);
  revalidatePath(ROTA);
}