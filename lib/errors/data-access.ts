type ProviderLikeError = {
  code?: unknown;
  statusCode?: unknown;
  name?: unknown;
};

export const DATA_LOAD_ERROR_MESSAGE =
  "Não foi possível carregar os dados desta tela. Tente novamente e, se o problema persistir, informe o horário ao administrador.";

function stableErrorIdentifier(value: unknown): string | number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!/^[A-Za-z0-9_.:-]{1,80}$/.test(normalized)) return null;
  return normalized;
}

function providerLikeError(error: unknown): ProviderLikeError | null {
  return error !== null && typeof error === "object" ? error as ProviderLikeError : null;
}

/**
 * Registra somente o contexto e um identificador estável do provedor.
 *
 * `catch` em TypeScript entrega `unknown`, então esta fronteira aceita qualquer
 * falha e extrai apenas `code`, `statusCode` ou `name` quando o valor pertence
 * a um vocabulário curto e seguro. Mensagem, detalhe, hint, consulta, stack e
 * payload nunca entram no log.
 */
export function reportDataAccessError(context: string, error: unknown) {
  const providerError = providerLikeError(error);
  if (!providerError) return;
  console.error(`[data-access:${context}]`, {
    code:
      stableErrorIdentifier(providerError.code) ??
      stableErrorIdentifier(providerError.statusCode) ??
      stableErrorIdentifier(providerError.name) ??
      "UNKNOWN"
  });
}

/**
 * Texto público de uma falha de acesso a dados, com o erro do provedor no log.
 *
 * Nasceu da convergência do PR #42: **293 pontos em 72 arquivos do RH** entregavam
 * `error.message` do PostgREST direto ao usuário — em `throw new Error(...)`, em
 * `fail(...)` e, pior, em `redirect(...?error=${encodeURIComponent(...)})`, que
 * põe nome de coluna, detalhe e hint da consulta **na barra de endereço**, onde
 * ficam em histórico, em log de proxy e em captura de tela.
 *
 * A troca é de uma expressão por outra, e é isso que a torna aplicável aos 293
 * pontos sem reescrever o fluxo de cada um: onde havia `erro.message`, passa a
 * haver esta chamada. O que o usuário lê deixa de variar com a mensagem interna
 * do banco; o que o operador precisa para diagnosticar continua indo para o log,
 * reduzido ao identificador estável por `reportDataAccessError`.
 *
 * O terceiro parâmetro preserva a mensagem específica onde ela já existia — os
 * 63 pontos escritos como `erro?.message ?? "Vínculo não encontrado."` mantêm o
 * "Vínculo não encontrado.", que é informação de domínio e não vaza nada.
 */
export function mensagemDeFalha(
  contexto: string,
  error: unknown,
  publica = "Não foi possível concluir a operação. A falha foi registrada."
): string {
  reportDataAccessError(contexto, error);
  return publica;
}
