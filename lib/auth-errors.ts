export type AuthErrorLike = {
  code?: unknown;
  status?: unknown;
  name?: unknown;
  message?: unknown;
};

const MENSAGEM_INDISPONIVEL =
  "Não foi possível conectar ao serviço de autenticação. Tente novamente em instantes.";

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function statusNumerico(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

export function dadosSegurosDoErroDeLogin(error: unknown) {
  const authError = (typeof error === "object" && error !== null ? error : {}) as AuthErrorLike;
  return {
    code: texto(authError.code) || "UNKNOWN",
    status: statusNumerico(authError.status),
    name: texto(authError.name) || (error instanceof Error ? error.name : "UnknownError")
  };
}

export function mensagemPublicaDeErroDeLogin(error: unknown): string {
  const authError = (typeof error === "object" && error !== null ? error : {}) as AuthErrorLike;
  const code = texto(authError.code);
  const status = statusNumerico(authError.status);
  const name = texto(authError.name) || (error instanceof Error ? error.name : "");

  // VACINA-018: o código estável do Auth decide a mensagem. Texto interno não
  // vai para a URL nem para a tela, e indisponibilidade nunca vira culpa do usuário.
  if (code === "invalid_credentials") {
    return "E-mail ou senha inválidos.";
  }

  if (code === "email_not_confirmed") {
    return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou fale com o administrador.";
  }

  if (
    status === 429 ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit"
  ) {
    return "Muitas tentativas de acesso em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (
    (status !== null && status >= 500) ||
    code === "unexpected_failure" ||
    name === "AuthRetryableFetchError" ||
    name === "AuthUnknownError" ||
    error instanceof TypeError
  ) {
    return MENSAGEM_INDISPONIVEL;
  }

  return "Não foi possível concluir o acesso. Confira os dados e tente novamente.";
}
