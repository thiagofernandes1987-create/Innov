"use server";

// Estúdio de objetos — as escritas.
//
// Um módulo `"use server"` só exporta função assíncrona (VACINA-047): tipo e
// constante vivem em `lib/object-runtime`.
//
// Toda escrita passa por RPC: `create_object_definition`,
// `save_object_definition_draft` e `publish_object_definition`. A tabela não
// tem `grant insert/update` para `authenticated` — é o padrão da VACINA-004 e
// da VACINA-005, e é o que impede a projeção de slots de divergir do spec.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/authorization";
import { definicaoPorId } from "@/lib/object-runtime/estudio";
import { camposParecidos } from "@/lib/object-runtime/parecidos";
import { campoDoProposito, chaveDeCampo, proposito } from "@/lib/object-runtime/proposito";
import {
  allocateSlots,
  validateSpec,
  type ObjectFieldSpec,
  type ObjectSpec
} from "@/lib/object-runtime/spec";

const LISTA = "/app/administracao/objetos";

function texto(dados: FormData, chave: string): string {
  return String(dados.get(chave) ?? "").trim();
}

function falhar(rota: string, mensagem: string): never {
  redirect(`${rota}${rota.includes("?") ? "&" : "?"}error=${encodeURIComponent(mensagem)}`);
}

/**
 * Cria o objeto em rascunho e leva direto para a declaração dos campos.
 *
 * A chave sai do nome — quem cria não responde duas perguntas para a mesma
 * coisa. Nome repetido esbarra na chave repetida, e a RPC responde com uma
 * frase em vez de uma violação de unicidade.
 */
export async function criarObjeto(dados: FormData): Promise<void> {
  const contexto = await requireCapability("administracao", "manage");
  const nome = texto(dados, "nome");
  const moduleKey = texto(dados, "moduleKey");
  const escopo = texto(dados, "escopo") || "organizacao";
  const chave = chaveDeCampo(nome);

  if (!chave) falhar(LISTA, "O objeto precisa de um nome que produza uma chave — use letras.");
  if (!moduleKey) falhar(LISTA, "Escolha de qual aplicativo o objeto herda a permissão.");

  const { data, error } = await contexto.supabase.rpc("create_object_definition", {
    p_organization_id: contexto.organizationId,
    p_key: chave,
    p_name: nome,
    p_class: "cadastro",
    p_module_key: moduleKey,
    p_scope: escopo
  });

  if (error) falhar(LISTA, error.message);
  revalidatePath(LISTA);
  redirect(`${LISTA}/${String(data)}`);
}

async function rascunhoEditavel(definitionId: string, rota: string) {
  const contexto = await requireCapability("administracao", "manage");
  const definicao = await definicaoPorId(contexto.supabase, contexto.organizationId, definitionId);
  if (!definicao) falhar(LISTA, "Objeto não encontrado.");
  return { contexto, definicao, rota };
}

async function guardar(
  contexto: Awaited<ReturnType<typeof requireCapability>>,
  definitionId: string,
  spec: ObjectSpec,
  rota: string
): Promise<void> {
  const { error } = await contexto.supabase.rpc("save_object_definition_draft", {
    p_definition_id: definitionId,
    p_draft_spec: spec as unknown as Record<string, unknown>
  });
  if (error) falhar(rota, error.message);
  revalidatePath(rota);
  revalidatePath(LISTA);
}

/**
 * Acrescenta um campo a partir do que a informação **faz**.
 *
 * A validação aqui é só a que precisa ser respondida agora: chave repetida e
 * orçamento de campos filtráveis. O resto — opções de uma seleção, por exemplo
 * — é cobrado na publicação, porque exigir tudo no momento de acrescentar
 * impediria de declarar uma seleção antes de saber as opções dela.
 */
export async function acrescentarCampo(dados: FormData): Promise<void> {
  const definitionId = texto(dados, "definitionId");
  const rota = `${LISTA}/${definitionId}`;
  const { contexto, definicao } = await rascunhoEditavel(definitionId, rota);

  const propositoId = texto(dados, "proposito");
  const rotulo = texto(dados, "rotulo");

  if (!proposito(propositoId)) falhar(rota, "Escolha o que essa informação é.");
  const campo = campoDoProposito(propositoId, rotulo, {
    obrigatorio: texto(dados, "obrigatorio") === "on"
  });
  if (!campo) falhar(rota, "O campo precisa de um nome que produza uma chave — use letras.");

  if (definicao.rascunho.fields.some(existente => existente.key === campo.key)) {
    falhar(rota, `Este objeto já tem um campo chamado "${campo.label}".`);
  }

  // **Antes de criar, e não depois.** Dois campos quase iguais no mesmo objeto
  // não são erro de digitação: são o mesmo dado preenchido pela metade em dois
  // lugares, e nenhuma contagem que os some fecha. A pergunta é feita uma vez;
  // quem confirma segue, e é por isso que a sugestão não vira obrigação.
  if (texto(dados, "confirmado") !== "sim") {
    const parecidos = camposParecidos(rotulo, definicao.rascunho.fields);
    if (parecidos.length) {
      const consulta = new URLSearchParams({
        parecido: "1",
        rotulo,
        proposito: propositoId,
        obrigatorio: texto(dados, "obrigatorio") === "on" ? "sim" : "nao"
      });
      redirect(`${rota}?${consulta.toString()}`);
    }
  }

  const campos: ObjectFieldSpec[] = [...definicao.rascunho.fields, campo];
  // Só o campo novo importa aqui: se ele estourou o orçamento, é ele que a
  // mensagem precisa nomear — dizer "algo não coube" obriga a caçar.
  if (allocateSlots(campos).overflow.includes(campo.key)) {
    falhar(
      rota,
      `"${campo.label}" passou do limite de campos filtráveis desse tipo. Desmarque a busca de outro campo do mesmo tipo, ou declare este sem busca.`
    );
  }

  await guardar(contexto, definitionId, { ...definicao.rascunho, fields: campos }, rota);
  // Limpa a pergunta da barra de endereço. Sem isto, quem respondeu "criar
  // assim mesmo" volta para a mesma tela ainda perguntando se quer criar — e a
  // pergunta já respondida reaparece a cada campo seguinte.
  redirect(rota);
}

/**
 * Liga e desliga a busca de um campo.
 *
 * Campo nasce filtrável onde o tipo permite — campo que não entra na busca
 * vira campo que ninguém lê. Desligar é decisão de quem declarou, e é o que
 * libera slot quando o orçamento aperta.
 */
export async function alternarBuscaDoCampo(dados: FormData): Promise<void> {
  const definitionId = texto(dados, "definitionId");
  const rota = `${LISTA}/${definitionId}`;
  const { contexto, definicao } = await rascunhoEditavel(definitionId, rota);
  const chave = texto(dados, "campo");

  const campos = definicao.rascunho.fields.map(campo =>
    campo.key === chave ? { ...campo, indexed: !campo.indexed } : campo
  );
  const alvo = campos.find(campo => campo.key === chave);
  if (!alvo) falhar(rota, "Campo não encontrado.");

  if (allocateSlots(campos).overflow.includes(chave)) {
    falhar(
      rota,
      `"${alvo.label}" não cabe na busca: o limite de campos filtráveis desse tipo já está cheio.`
    );
  }

  await guardar(contexto, definitionId, { ...definicao.rascunho, fields: campos }, rota);
}

/** As opções de um campo de escolha, uma por linha. */
export async function definirOpcoesDoCampo(dados: FormData): Promise<void> {
  const definitionId = texto(dados, "definitionId");
  const rota = `${LISTA}/${definitionId}`;
  const { contexto, definicao } = await rascunhoEditavel(definitionId, rota);
  const chave = texto(dados, "campo");

  const opcoes = String(dados.get("opcoes") ?? "")
    .split("\n")
    .map(linha => linha.trim())
    .filter(Boolean);

  const campos = definicao.rascunho.fields.map(campo =>
    campo.key === chave ? { ...campo, options: opcoes } : campo
  );
  await guardar(contexto, definitionId, { ...definicao.rascunho, fields: campos }, rota);
}

/**
 * Arquiva o campo — ou o traz de volta.
 *
 * **Arquivar é o que existe no lugar de excluir**, depois que há versão
 * publicada. O registro guarda a versão com que nasceu, e essa versão declara
 * o campo: apagá-lo da definição tornaria ilegível o que já foi registrado com
 * ele. Arquivado sai do formulário, continua legível no histórico e devolve a
 * coluna-slot que ocupava.
 *
 * Arquivado e obrigatório ao mesmo tempo é registro que ninguém consegue
 * salvar; a obrigatoriedade cai junto.
 */
export async function alternarArquivoDoCampo(dados: FormData): Promise<void> {
  const definitionId = texto(dados, "definitionId");
  const rota = `${LISTA}/${definitionId}`;
  const { contexto, definicao } = await rascunhoEditavel(definitionId, rota);
  const chave = texto(dados, "campo");

  const campos = definicao.rascunho.fields.map(campo =>
    campo.key === chave
      ? { ...campo, archived: !campo.archived, required: campo.archived ? campo.required : false }
      : campo
  );
  if (!campos.some(campo => campo.key === chave)) falhar(rota, "Campo não encontrado.");

  // Reativar pode não caber: o slot foi devolvido e outro campo pode ter
  // ocupado a vaga enquanto isso.
  if (allocateSlots(campos).overflow.includes(chave)) {
    falhar(
      rota,
      "Não dá para reativar este campo com a busca ligada: o limite de campos filtráveis desse tipo está cheio. Desligue a busca de outro campo antes."
    );
  }

  await guardar(contexto, definitionId, { ...definicao.rascunho, fields: campos }, rota);
}

/**
 * Tira o campo do rascunho.
 *
 * Só antes da primeira publicação. Depois que existe versão publicada, remover
 * campo é mudança incompatível: há registro gravado sob uma versão que declara
 * esse campo, e apagá-lo da definição torna o registro antigo ilegível. O
 * caminho para isso é plano de migração (§8.3), não um botão de excluir.
 */
export async function removerCampo(dados: FormData): Promise<void> {
  const definitionId = texto(dados, "definitionId");
  const rota = `${LISTA}/${definitionId}`;
  const { contexto, definicao } = await rascunhoEditavel(definitionId, rota);

  if (definicao.versaoAtual !== null) {
    falhar(
      rota,
      "Este objeto já foi publicado: remover um campo tornaria ilegível o que já foi registrado com ele. Arquive o campo — ele sai do formulário e o histórico continua legível."
    );
  }

  const chave = texto(dados, "campo");
  const campos = definicao.rascunho.fields.filter(campo => campo.key !== chave);
  await guardar(contexto, definitionId, { ...definicao.rascunho, fields: campos }, rota);
}

/**
 * Publica a versão.
 *
 * A validação local roda antes da RPC para a mensagem chegar completa: o banco
 * recusa no primeiro erro que encontra, e quem declarou onze campos prefere
 * ver os três problemas de uma vez.
 */
export async function publicarObjeto(dados: FormData): Promise<void> {
  const definitionId = texto(dados, "definitionId");
  const rota = `${LISTA}/${definitionId}`;
  const { contexto, definicao } = await rascunhoEditavel(definitionId, rota);

  const erros = validateSpec(definicao.rascunho);
  if (erros.length) falhar(rota, erros.join(" "));

  const { error } = await contexto.supabase.rpc("publish_object_definition", {
    p_definition_id: definitionId,
    p_spec: definicao.rascunho as unknown as Record<string, unknown>
  });
  if (error) falhar(rota, error.message);

  revalidatePath(rota);
  revalidatePath(LISTA);
}
