"use server";

// Um módulo "use server" só exporta função assíncrona: tipo e constante ficam
// em `lib/documentos/modelos`, senão chegam ao cliente como `undefined`.
import { revalidatePath } from "next/cache";
import { hasCapability, requireCapability } from "@/lib/authorization";
import { moduloDaFuncao } from "@/lib/documentos/funcoes";
import { extrairVariaveis } from "@/lib/documentos/modelo";
import {
  ESTADO_INICIAL,
  traduzirFalhaDoBanco,
  validarModelo,
  type ErroDeCampo,
  type EstadoDoModelo
} from "@/lib/documentos/modelos";

// Gravação de modelo de documento.
//
// Nenhuma destas ações redireciona em erro. Elas devolvem estado, porque o
// formulário é um editor: perder duas páginas de contrato porque o nome repetiu
// é o defeito de VACINA-042 na sua forma mais cara.
//
// A concorrência é tratada de frente, não ignorada: `version_number` viaja no
// formulário e a gravação só acontece se a versão no banco ainda for aquela.
// Sem isso, dois responsáveis editando o mesmo modelo — que é o caso normal de
// um modelo de proposta da empresa — fazem o último apagar o trabalho do
// primeiro **sem nenhum dos dois ficar sabendo**.

function texto(formData: FormData, chave: string) {
  return String(formData.get(chave) ?? "").trim();
}

function falha(base: EstadoDoModelo, mensagem: string, erros: ErroDeCampo[] = []): EstadoDoModelo {
  return { ...base, ok: false, mensagem, erros, corpoSalvo: null };
}

/**
 * Salva rascunho ou publica, conforme o botão.
 *
 * Insere quando não há `modeloId`, atualiza quando há. Publicar é a mesma
 * gravação com a régua dura: corpo obrigatório e nenhuma variável que não
 * resolva na função.
 */
export async function salvarModelo(
  anterior: EstadoDoModelo,
  formData: FormData
): Promise<EstadoDoModelo> {
  const funcao = texto(formData, "funcao");
  const publicar = formData.get("publicar") !== null;
  const nome = texto(formData, "nome");
  // O envio de formulário normaliza a quebra de linha do `textarea` para CRLF
  // — é o que a especificação manda. Sem desfazer isso, o corpo gravado nunca
  // é igual ao da tela: o diff da próxima versão apareceria inteiro alterado, e
  // o selo "salvo", que compara o que voltou com o que está escrito, ficaria
  // eternamente em "não salvo".
  const corpo = String(formData.get("corpo") ?? "").replace(/\r\n/g, "\n");
  const modeloId = texto(formData, "modeloId") || null;
  const versao = Number(formData.get("versao") ?? 0);

  const base: EstadoDoModelo = { ...anterior, modeloId, nome, versao };

  const { erros } = validarModelo({ nome, corpo, funcao, publicar });
  if (erros.length > 0) {
    return falha(base, publicar ? "Não deu para publicar." : "Não deu para salvar.", erros);
  }

  const moduleKey = moduloDaFuncao(funcao);
  if (!moduleKey) return falha(base, "Este tipo de documento não pertence a nenhum aplicativo.");

  // Publicar é ato da organização, salvar é do autor: exigem capacidades
  // diferentes do mesmo módulo. `requireCapability` redireciona quem não tem
  // acesso nenhum ao aplicativo; a RLS é quem decide de novo na gravação.
  const context = await requireCapability(moduleKey, publicar ? "approve" : "update");


  // Estado atual antes de decidir o próximo. Salvar um modelo **publicado** não
  // pode rebaixá-lo a rascunho em silêncio: quem emite documento continuaria
  // vendo a versão antiga, ou nenhuma, sem ninguém ter pedido isso. Editar o
  // publicado é editar o que a organização usa, e por isso pede a mesma alçada
  // de publicar — que é o que a política do banco também exige.
  let jaPublicado = false;
  if (modeloId) {
    const { data: atual } = await context.supabase
      .from("document_templates")
      .select("status")
      .eq("id", modeloId)
      .maybeSingle();
    jaPublicado = atual?.status === "PUBLISHED";
  }
  const publicado = publicar || jaPublicado;

  // Editar o que já está publicado exige a mesma alçada de publicar. Sem esta
  // conferência a política do banco recusaria de qualquer forma — mas o usuário
  // leria "sem permissão para gravar" depois de escrever, em vez de saber
  // antes que aquele modelo não é dele para mexer.
  if (publicado && !(await hasCapability(moduleKey, "approve", null, context))) {
    return falha(
      base,
      "Este modelo está publicado: alterá-lo muda o documento que toda a organização emite, e isso exige acesso total ao aplicativo. Use Salvar como… para trabalhar numa cópia sua."
    );
  }

  const linha = {
    name: nome,
    body_markdown: corpo,
    variables: extrairVariaveis(corpo),
    status: publicado ? ("PUBLISHED" as const) : ("DRAFT" as const),
    updated_by: context.userId,
    updated_at: new Date().toISOString(),
    ...(publicar ? { published_by: context.userId, published_at: new Date().toISOString() } : {})
  };

  if (!modeloId) {
    const { data, error } = await context.supabase
      .from("document_templates")
      .insert({
        organization_id: context.organizationId,
        module_key: moduleKey,
        purpose: funcao,
        created_by: context.userId,
        version_number: 1,
        ...linha
      })
      .select("id, version_number, status, updated_at")
      .single();
    if (error || !data) return falha(base, traduzirFalhaDoBanco(error));
    revalidatePath("/app/documentos/modelos");
    return {
      ok: true,
      mensagem: publicar ? "Modelo publicado." : jaPublicado ? "Modelo publicado atualizado." : "Modelo salvo.",
      erros: [],
      modeloId: String(data.id),
      nome,
      versao: Number(data.version_number),
      status: data.status,
      salvoEm: String(data.updated_at),
      corpoSalvo: corpo
    };
  }

  const { data, error } = await context.supabase
    .from("document_templates")
    .update({ ...linha, version_number: versao + 1 })
    .eq("id", modeloId)
    .eq("version_number", versao)
    .select("id, version_number, status, updated_at")
    .maybeSingle();

  if (error) return falha(base, traduzirFalhaDoBanco(error));

  if (!data) {
    // Zero linhas tem três causas e elas pedem respostas diferentes. Dizer
    // "erro ao salvar" para as três é o que faz o usuário tentar de novo no
    // caso em que tentar de novo destrói o trabalho de outra pessoa.
    const { data: atual } = await context.supabase
      .from("document_templates")
      .select("version_number, updated_at")
      .eq("id", modeloId)
      .maybeSingle();
    if (!atual) {
      return falha(base, "Este modelo não está mais disponível para você — pode ter sido excluído ou seu acesso mudou.");
    }
    return falha(
      base,
      `Alguém salvou este modelo depois de você (versão ${atual.version_number}). ` +
        "Seu texto continua aqui: abra o modelo em outra aba, compare e regrave."
    );
  }

  revalidatePath("/app/documentos/modelos");
  return {
    ok: true,
    mensagem: publicar ? "Modelo publicado." : jaPublicado ? "Modelo publicado atualizado." : "Modelo salvo.",
    erros: [],
    modeloId: String(data.id),
    nome,
    versao: Number(data.version_number),
    status: data.status,
    salvoEm: String(data.updated_at),
    corpoSalvo: corpo
  };
}

/**
 * Exclui rascunho nunca publicado; arquiva o resto.
 *
 * A política de `delete` já exige `published_at is null`, e o comentário da
 * migration diz o motivo: modelo que gerou documento não some, porque a
 * auditoria precisa chegar no molde que originou o que foi assinado.
 */
export async function excluirModelo(
  anterior: EstadoDoModelo,
  formData: FormData
): Promise<EstadoDoModelo> {
  const funcao = texto(formData, "funcao");
  const modeloId = texto(formData, "modeloId");
  const base: EstadoDoModelo = { ...anterior, modeloId: modeloId || null };
  if (!modeloId) return falha(base, "Abra um modelo salvo antes de excluir.");

  const moduleKey = moduloDaFuncao(funcao);
  if (!moduleKey) return falha(base, "Este tipo de documento não pertence a nenhum aplicativo.");
  const context = await requireCapability(moduleKey, "delete");

  const { data: alvo } = await context.supabase
    .from("document_templates")
    .select("published_at")
    .eq("id", modeloId)
    .maybeSingle();
  if (!alvo) return falha(base, "Este modelo não está mais disponível para você.");

  if (alvo.published_at) {
    const { error } = await context.supabase
      .from("document_templates")
      .update({ status: "ARCHIVED", archived_at: new Date().toISOString(), updated_by: context.userId })
      .eq("id", modeloId);
    if (error) return falha(base, traduzirFalhaDoBanco(error));
    revalidatePath("/app/documentos/modelos");
    return {
      ...ESTADO_INICIAL,
      ok: true,
      mensagem: "Modelo já publicado: foi arquivado, não excluído. Ele para de aparecer para quem emite documento, e continua disponível para auditoria.",
      status: "ARCHIVED",
      modeloId
    };
  }

  const { error, count } = await context.supabase
    .from("document_templates")
    .delete({ count: "exact" })
    .eq("id", modeloId);
  if (error) return falha(base, traduzirFalhaDoBanco(error));
  if (!count) return falha(base, "Você não tem permissão para excluir modelos deste aplicativo.");

  revalidatePath("/app/documentos/modelos");
  return { ...ESTADO_INICIAL, ok: true, mensagem: "Modelo excluído." };
}
