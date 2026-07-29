type DatabaseLikeError = {
  code?: string | null;
};

export const DATA_LOAD_ERROR_MESSAGE =
  "Não foi possível carregar os dados desta tela. Tente novamente e, se o problema persistir, informe o horário ao administrador.";

/**
 * Registra somente o contexto e o código estável do provedor.
 * Mensagem, detalhe, hint, consulta e payload não entram no log porque podem
 * carregar nomes de tabela, regras internas ou dados do usuário.
 */
export function reportDataAccessError(context: string, error: DatabaseLikeError | null | undefined) {
  if (!error) return;
  console.error(`[data-access:${context}]`, {
    code: error.code ?? "UNKNOWN"
  });
}
