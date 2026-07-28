import { describe, expect, it } from "vitest";
import { mensagemPublicaDeErroDeLogin } from "../lib/auth-errors";

describe("mensagemPublicaDeErroDeLogin", () => {
  it("mantém credencial inválida distinta de falha de infraestrutura", () => {
    expect(mensagemPublicaDeErroDeLogin({
      code: "invalid_credentials",
      status: 400,
      message: "Invalid login credentials"
    })).toBe("E-mail ou senha inválidos.");
  });

  it("orienta quando o e-mail ainda não foi confirmado", () => {
    expect(mensagemPublicaDeErroDeLogin({
      code: "email_not_confirmed",
      status: 400,
      message: "Email not confirmed"
    })).toMatch(/confirmado/i);
  });

  it("trata limite de tentativas sem chamar a credencial de inválida", () => {
    expect(mensagemPublicaDeErroDeLogin({
      code: "over_request_rate_limit",
      status: 429,
      message: "Too many requests"
    })).toMatch(/tentativas/i);
  });

  it("trata erro 5xx como indisponibilidade do serviço", () => {
    const mensagem = mensagemPublicaDeErroDeLogin({
      code: "unexpected_failure",
      status: 500,
      message: "Database error"
    });
    expect(mensagem).toMatch(/serviço de autenticação/i);
    expect(mensagem).not.toMatch(/credenciais inválidas/i);
  });

  it("trata falha de rede lançada pelo cliente como indisponibilidade", () => {
    const mensagem = mensagemPublicaDeErroDeLogin(new TypeError("fetch failed"));
    expect(mensagem).toMatch(/serviço de autenticação/i);
    expect(mensagem).not.toMatch(/credenciais inválidas/i);
  });
});
