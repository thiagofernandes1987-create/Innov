"use server";

// Um módulo "use server" só exporta função assíncrona (VACINA-047): tipo e
// constante ficam em `lib/documentos/modelos`.
import { revalidatePath } from "next/cache";
import { hasCapability, requireCapability } from "@/lib/authorization";
import { extrairVariaveis } from "@/lib/documentos/modelo";
import {
  ESTADO_INICIAL,
  traduzirFalhaDoBanco,
  validarModelo,
  type ErroDeCampo,
  type EstadoDoModelo
} from "@/lib/documentos/modelos";
import { tipo as tipoDoCatalogo } from "@/lib/documentos/tipos";

// Gravação na biblioteca de Modelos e Documentações.
//
// **Uma biblioteca só, lida por todos os aplicativos.** A permissão é sempre a
// do aplicativo `modelos`; o `document_type` diz o que a peça é, e a
// Administração decide, por empresa, quais tipos cada aplicativo oferece. Foi a
// correção pedida em 3 de agosto: preso ao módulo emissor, não haveria como
// mandar a proposta de dentro de Projetos nem anexar o contrato assinado num
// atendimento.
//
// Nenhuma destas ações redireciona em erro. Elas devolvem estado, porque o
// formulário é um editor: perder duas páginas de contrato porque o nome repetiu
// é o defeito de VACINA-042 na forma mais cara.

const MODULO = "modelos";
const ROTA = "/app/modelos";

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
 * resolva no tipo.
 */
export async function salvarModelo(
  anterior: EstadoDoModelo,
  formData: FormData
): Promise<EstadoDoModelo> {
  const tipo = texto(formData, "tipo");
  const publicar = formData.get("publicar") !== null;
  const nome = texto(formData, "nome");
  // O envio de formulário normaliza a quebra de linha do `textarea` para CRLF —
  // é o que a especificação manda, e sem desfazer isso o corpo gravado nunca é
  // igual ao da tela (VACINA-048).
  const corpo = String(formData.get("corpo") ?? "").replace(/\r\n/g, "\n");
  const modeloId = texto(formData, "modeloId") || null;
  const versao = Number(formData.get("versao") ?? 0);
  const visivelAoCliente = formData.get("clienteVe") !== null;

  const base: EstadoDoModelo = { ...anterior, modeloId, nome, versao };

  const { erros } = validarModelo({ nome, corpo, tipo, publicar });
  if (erros.length > 0) {
    return falha(base, publicar ? "Não deu para publicar." : "Não deu para salvar.", erros);
  }

  const context = await requireCapability(MODULO, publicar ? "approve" : "update");

  // Estado atual antes de decidir o próximo. Salvar um modelo publicado não
  // pode rebaixá-lo a rascunho em silêncio (VACINA-049); e modelo da plataforma
  // não é editável por empresa nenhuma — a cópia é o caminho.
  let jaPublicado = false;
  let daPlataforma = false;
  if (modeloId) {
    const { data: atual } = await context.supabase
      .from("document_templates")
      .select("status, scope")
      .eq("id", modeloId)
      .maybeSingle();
    jaPublicado = atual?.status === "PUBLISHED";
    daPlataforma = atual?.scope === "PLATAFORMA";
  }

  if (daPlataforma) {
    return falha(
      base,
      "Este modelo é da biblioteca da plataforma e vale para todas as empresas. Use Duplicar para a minha empresa e edite a cópia."
    );
  }

  const publicado = publicar || jaPublicado;
  if (publicado && !(await hasCapability(MODULO, "approve", null, context))) {
    return falha(
      base,
      "Este modelo está publicado: alterá-lo muda o documento que toda a empresa emite, e isso exige acesso total à biblioteca. Use Salvar como… para trabalhar numa cópia sua."
    );
  }

  const agora = new Date().toISOString();
  const linha = {
    name: nome,
    document_type: tipo,
    body_markdown: corpo,
    variables: extrairVariaveis(corpo),
    client_visible: visivelAoCliente,
    status: publicado ? ("PUBLISHED" as const) : ("DRAFT" as const),
    updated_by: context.userId,
    updated_at: agora,
    ...(publicar ? { published_by: context.userId, published_at: agora } : {})
  };

  const devolver = (
    data: { id: unknown; version_number: unknown; status: EstadoDoModelo["status"]; updated_at: unknown }
  ): EstadoDoModelo => ({
    ok: true,
    mensagem: publicar ? "Modelo publicado." : jaPublicado ? "Modelo publicado atualizado." : "Modelo salvo.",
    erros: [],
    modeloId: String(data.id),
    nome,
    versao: Number(data.version_number),
    status: data.status,
    salvoEm: String(data.updated_at),
    escopo: "ORGANIZACAO",
    corpoSalvo: corpo
  });

  if (!modeloId) {
    const { data, error } = await context.supabase
      .from("document_templates")
      .insert({
        organization_id: context.organizationId,
        scope: "ORGANIZACAO",
        created_by: context.userId,
        version_number: 1,
        ...linha
      })
      .select("id, version_number, status, updated_at")
      .single();
    if (error || !data) return falha(base, traduzirFalhaDoBanco(error));
    revalidatePath(ROTA);
    return devolver(data);
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
    // Zero linhas tem causas diferentes e elas pedem respostas diferentes.
    // Dizer "erro ao salvar" para todas é o que faz o usuário tentar de novo no
    // caso em que tentar de novo destrói o trabalho de outra pessoa.
    const { data: atual } = await context.supabase
      .from("document_templates")
      .select("version_number")
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

  revalidatePath(ROTA);
  return devolver(data);
}

/**
 * Copia um modelo da plataforma para a empresa.
 *
 * É o caminho que o responsável descreveu: o que ele define na plataforma se
 * repete para todas as empresas, e o que muda é o que o administrador de cada
 * uma edita. Editar por cima do padrão comum mudaria o de todo mundo; copiar
 * deixa a empresa dona da versão dela, com `derived_from` guardando de onde
 * veio — é o que permite depois mostrar no que ela divergiu do padrão.
 */
export async function duplicarModelo(
  anterior: EstadoDoModelo,
  formData: FormData
): Promise<EstadoDoModelo> {
  const modeloId = texto(formData, "modeloId");
  if (!modeloId) return falha(anterior, "Abra um modelo antes de duplicar.");
  const context = await requireCapability(MODULO, "create");

  const { data: origem } = await context.supabase
    .from("document_templates")
    .select("name, document_type, body_markdown, variables, client_visible, scope")
    .eq("id", modeloId)
    .maybeSingle();
  if (!origem) return falha(anterior, "Este modelo não está mais disponível para você.");

  const { data, error } = await context.supabase
    .from("document_templates")
    .insert({
      organization_id: context.organizationId,
      scope: "ORGANIZACAO",
      name: `${origem.name} (da minha empresa)`.slice(0, 120),
      document_type: origem.document_type,
      body_markdown: origem.body_markdown,
      variables: origem.variables,
      client_visible: origem.client_visible,
      status: "DRAFT",
      version_number: 1,
      derived_from: origem.scope === "PLATAFORMA" ? modeloId : null,
      created_by: context.userId,
      updated_by: context.userId
    })
    .select("id, version_number, status, updated_at, name, body_markdown")
    .single();
  if (error || !data) return falha(anterior, traduzirFalhaDoBanco(error));

  revalidatePath(ROTA);
  return {
    ok: true,
    mensagem: "Cópia criada na biblioteca da sua empresa. Edite à vontade: o padrão da plataforma continua intacto.",
    erros: [],
    modeloId: String(data.id),
    nome: String(data.name),
    versao: Number(data.version_number),
    status: "DRAFT",
    salvoEm: String(data.updated_at),
    escopo: "ORGANIZACAO",
    corpoSalvo: String(data.body_markdown)
  };
}

/**
 * Traz para a empresa os modelos padrão da plataforma que ela ainda não tem.
 *
 * A empresa nova já nasce com eles — o gatilho de `organizations` semeia no
 * cadastro. Este botão existe para dois casos: a empresa criada antes de um
 * padrão novo ser publicado, e a que quer o padrão de volta depois de arquivar
 * a cópia. A função no banco é idempotente, então repetir não duplica.
 */
export async function trazerPadroesDaPlataforma(
  anterior: { ok: boolean; mensagem: string },
  formData: FormData
): Promise<{ ok: boolean; mensagem: string }> {
  // A assinatura é a de `useActionState`; nenhum dos dois é lido aqui, porque a
  // ação não depende do que veio antes nem de campo de formulário.
  void anterior;
  void formData;
  const context = await requireCapability(MODULO, "create");
  const { data, error } = await context.supabase.rpc("semear_modelos_da_empresa", {
    p_organization_id: context.organizationId
  });
  if (error) return { ok: false, mensagem: traduzirFalhaDoBanco(error) };
  revalidatePath(ROTA);
  const copiados = Number(data ?? 0);
  return {
    ok: true,
    mensagem: copiados
      ? `${copiados} modelo(s) padrão copiados para a sua empresa. As cópias são suas: editar não muda o padrão nem o de nenhuma outra empresa.`
      : "Sua empresa já tem todos os modelos padrão da plataforma."
  };
}

/**
 * Exclui rascunho nunca publicado; arquiva o resto.
 *
 * A política de `delete` exige `published_at is null`: modelo que gerou
 * documento não some, porque a auditoria precisa chegar ao molde que originou o
 * que foi assinado.
 */
export async function excluirModelo(
  anterior: EstadoDoModelo,
  formData: FormData
): Promise<EstadoDoModelo> {
  const modeloId = texto(formData, "modeloId");
  const base: EstadoDoModelo = { ...anterior, modeloId: modeloId || null };
  if (!modeloId) return falha(base, "Abra um modelo salvo antes de excluir.");

  const context = await requireCapability(MODULO, "delete");

  const { data: alvo } = await context.supabase
    .from("document_templates")
    .select("published_at, scope")
    .eq("id", modeloId)
    .maybeSingle();
  if (!alvo) return falha(base, "Este modelo não está mais disponível para você.");
  if (alvo.scope === "PLATAFORMA") {
    return falha(base, "Modelo da plataforma não é excluído por uma empresa: ele vale para todas.");
  }

  if (alvo.published_at) {
    const { error } = await context.supabase
      .from("document_templates")
      .update({ status: "ARCHIVED", archived_at: new Date().toISOString(), updated_by: context.userId })
      .eq("id", modeloId);
    if (error) return falha(base, traduzirFalhaDoBanco(error));
    revalidatePath(ROTA);
    return {
      ...ESTADO_INICIAL,
      ok: true,
      mensagem:
        "Modelo já publicado: foi arquivado, não excluído. Ele para de aparecer para quem emite documento, e continua disponível para auditoria.",
      status: "ARCHIVED",
      modeloId
    };
  }

  const { error, count } = await context.supabase
    .from("document_templates")
    .delete({ count: "exact" })
    .eq("id", modeloId);
  if (error) return falha(base, traduzirFalhaDoBanco(error));
  if (!count) return falha(base, "Você não tem permissão para excluir modelos da biblioteca.");

  revalidatePath(ROTA);
  return { ...ESTADO_INICIAL, ok: true, mensagem: "Modelo excluído." };
}

/**
 * Marca quais tipos um aplicativo oferece.
 *
 * É **disponibilização, não segurança**: quem pode ler a biblioteca continua
 * sendo quem tem acesso ao aplicativo de modelos. Isto decide o que aparece na
 * lista de dentro de cada aplicativo, para o usuário não escolher entre trinta
 * e cinco tipos quando o que ele faz ali são três.
 */
export async function definirTiposDoAplicativo(
  anterior: { ok: boolean; mensagem: string },
  formData: FormData
): Promise<{ ok: boolean; mensagem: string }> {
  void anterior;
  const moduleKey = texto(formData, "aplicativo");
  if (!moduleKey) return { ok: false, mensagem: "Aplicativo não informado." };

  const escolhidos = formData
    .getAll("tipo")
    .map(v => String(v))
    .filter(v => tipoDoCatalogo(v) !== null);

  const context = await requireCapability("administracao", "manage");

  const { error: erroApagando } = await context.supabase
    .from("document_module_types")
    .delete()
    .eq("organization_id", context.organizationId)
    .eq("module_key", moduleKey);
  if (erroApagando) return { ok: false, mensagem: traduzirFalhaDoBanco(erroApagando) };

  if (escolhidos.length > 0) {
    const { error } = await context.supabase.from("document_module_types").insert(
      escolhidos.map(document_type => ({
        organization_id: context.organizationId,
        module_key: moduleKey,
        document_type,
        created_by: context.userId
      }))
    );
    if (error) return { ok: false, mensagem: traduzirFalhaDoBanco(error) };
  }

  revalidatePath("/app/administracao/modelos");
  revalidatePath(ROTA);
  return {
    ok: true,
    mensagem: `${escolhidos.length} tipo(s) disponíveis neste aplicativo.`
  };
}
