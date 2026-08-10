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
