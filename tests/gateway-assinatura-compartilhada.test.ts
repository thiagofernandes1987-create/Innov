import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canonicalSignaturePayload,
  signGatewayRequest,
  verifyGatewayRequest,
  GatewayAuthenticationError
} from "../apps/messaging-gateway/src/security";

// O lado TypeScript do contrato da §26.
//
// O par deste arquivo é `apps/execution-plane/gateway_test.go`. Os dois leem
// **o mesmo** `tests/fixtures/assinatura-gateway.json` e precisam reproduzir a
// mesma assinatura, byte a byte. É o que impede a divergência silenciosa: uma
// camada de execução que assina diferente do gateway não falha no compilador
// nem no teste unitário de cada lado — falha em produção, com 401 e sem pista.
//
// Por que uma fixture em disco, e não uma constante em cada teste: constante
// duplicada nas duas linguagens é ajustada nas duas quando alguém "corrige" o
// algoritmo, e a divergência passa. Arquivo único, não.

type Caso = {
  nome: string;
  timestamp: string;
  nonce: string;
  metodo: string;
  caminho: string;
  corpo: string;
  cargaCanonica: string;
  assinatura: string;
};

type Fixture = { segredo: string; algoritmo: string; casos: Caso[] };

const fixture: Fixture = JSON.parse(
  readFileSync(new URL("./fixtures/assinatura-gateway.json", import.meta.url), "utf8")
);

describe("contrato de assinatura do gateway, compartilhado com a camada de execução em Go", () => {
  it("cobre exatamente o que costuma divergir entre linguagens", () => {
    // Lista fechada, e não um piso de quantidade. Um caso só prova que o
    // algoritmo roda; o contrato precisa cobrir o que de fato diverge entre
    // runtimes — corpo vazio, acento, caractere fora do BMP e o próprio
    // separador dentro dos campos. Quem remover um caso reprova aqui, que é o
    // ponto: contrato que encolhe em silêncio deixa de ser contrato.
    expect(fixture.casos.map(caso => caso.nome)).toEqual([
      "corpo vazio",
      "corpo com acento",
      "método em minúsculas é normalizado para maiúsculas",
      "caminho com query",
      "corpo com emoji fora do BMP",
      "corpo e nonce com ponto, que é o separador da carga canônica"
    ]);
    expect({
      vazio: fixture.casos.some(caso => caso.corpo === ""),
      acento: fixture.casos.some(caso => /[áàãâéíóôúç]/i.test(caso.corpo)),
      foraDoBMP: fixture.casos.some(caso => [...caso.corpo].some(c => c.codePointAt(0)! > 0xffff)),
      pontoNoNonce: fixture.casos.some(caso => caso.nonce.includes("."))
    }).toEqual({ vazio: true, acento: true, foraDoBMP: true, pontoNoNonce: true });
  });

  it.each(fixture.casos.map(caso => [caso.nome, caso] as const))(
    "reproduz a assinatura da fixture — %s",
    (_nome, caso) => {
      const entrada = {
        secret: fixture.segredo,
        timestamp: caso.timestamp,
        nonce: caso.nonce,
        method: caso.metodo,
        path: caso.caminho,
        body: caso.corpo
      };
      expect(canonicalSignaturePayload(entrada)).toBe(caso.cargaCanonica);
      expect(signGatewayRequest(entrada)).toBe(caso.assinatura);
    }
  );

  it("aceita a assinatura da fixture na verificação", () => {
    const caso = fixture.casos[1];
    expect(() =>
      verifyGatewayRequest({
        secret: fixture.segredo,
        timestamp: caso.timestamp,
        nonce: caso.nonce,
        method: caso.metodo,
        path: caso.caminho,
        body: caso.corpo,
        signature: caso.assinatura
      })
    ).not.toThrow();
  });

  it("recusa a assinatura de outro caso no lugar da certa", () => {
    // Assinatura válida, do caso errado. É o que um replay parcial produz, e é
    // o que uma comparação frouxa deixaria passar.
    const caso = fixture.casos[1];
    const outra = fixture.casos[2];
    expect(() =>
      verifyGatewayRequest({
        secret: fixture.segredo,
        timestamp: caso.timestamp,
        nonce: caso.nonce,
        method: caso.metodo,
        path: caso.caminho,
        body: caso.corpo,
        signature: outra.assinatura
      })
    ).toThrow(GatewayAuthenticationError);
  });
});
