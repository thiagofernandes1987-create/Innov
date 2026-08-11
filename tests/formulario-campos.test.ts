import { describe, expect, it } from "vitest";
import { campoDeTexto } from "../lib/forms/campos";

/**
 * VACINA-048 — o `textarea` enviado por formulário chega com CRLF.
 *
 * O defeito original: o selo do editor de modelo dizia "Não salvo" logo depois
 * de salvar com sucesso, porque o corpo da tela tinha 530 caracteres e o que o
 * servidor devolveu tinha 553. Uma quebra de linha virou dois caracteres em
 * cada uma das 23 linhas, e a comparação por igualdade nunca deu verdadeiro.
 *
 * A conferência que existia era humana: abrir a tela, salvar, olhar o selo. Esta
 * suíte é a T-73.2 — transformar essa conferência em teste, que é o que a S-73
 * pediu para as vacinas universais.
 */

const CORPO_DA_TELA = ["# Contrato", "", "Prezado {{cliente.nome}},", "", "Assinado."].join("\n");
const CORPO_ENVIADO = CORPO_DA_TELA.replace(/\n/g, "\r\n");

describe("campoDeTexto — a normalização de entrada", () => {
  it("desfaz o CRLF que o envio de formulário introduz", () => {
    const dados = new FormData();
    dados.set("corpo", CORPO_ENVIADO);
    expect(campoDeTexto(dados, "corpo")).toBe(CORPO_DA_TELA);
  });

  it("o defeito é de tamanho, e é por tamanho que se prova", () => {
    // Quatro quebras de linha, quatro caracteres a mais. Este é o número que
    // apareceu na detecção original — 553 contra 530 — em escala menor.
    expect(CORPO_ENVIADO.length - CORPO_DA_TELA.length).toBe(4);

    const dados = new FormData();
    dados.set("corpo", CORPO_ENVIADO);
    expect(campoDeTexto(dados, "corpo").length).toBe(CORPO_DA_TELA.length);
  });

  it("também normaliza o `\\r` sozinho, que vem de colagem e não do formulário", () => {
    const dados = new FormData();
    dados.set("corpo", "um\rdois\r\ntres\nquatro");
    expect(campoDeTexto(dados, "corpo")).toBe("um\ndois\ntres\nquatro");
  });

  it("não mexe no que já está normalizado, e aplicar duas vezes dá o mesmo", () => {
    const dados = new FormData();
    dados.set("corpo", CORPO_DA_TELA);
    const uma = campoDeTexto(dados, "corpo");
    expect(uma).toBe(CORPO_DA_TELA);

    const outra = new FormData();
    outra.set("corpo", uma);
    expect(campoDeTexto(outra, "corpo")).toBe(uma);
  });

  it("campo ausente é string vazia, não `null` nem a palavra \"null\"", () => {
    expect(campoDeTexto(new FormData(), "inexistente")).toBe("");
  });

  it("não apara espaço — aparar é decisão de quem chama", () => {
    // Se esta função aparasse, o corpo de um contrato perderia a linha em
    // branco final que o autor deixou de propósito, e quem quisesse o valor
    // cru não teria como pedir.
    const dados = new FormData();
    dados.set("corpo", "  texto com margem  ");
    expect(campoDeTexto(dados, "corpo")).toBe("  texto com margem  ");
  });
});

describe("ida e volta pelo transporte, que é onde a suspeita costuma cair", () => {
  // A suspeita natural é que o `\r\n` seja invenção do transporte e que ele
  // mesmo desfaça na volta. Não é: o multipart preserva byte a byte o que
  // recebeu. Quem tem de normalizar é o servidor, na entrada — e é por isso que
  // corrigir só a comparação deixaria o banco com CRLF, como a vacina registra.
  it("o multipart entrega de volta exatamente o que recebeu, CRLF inclusive", async () => {
    const enviado = new FormData();
    enviado.set("corpo", CORPO_ENVIADO);

    const recebido = await new Request("http://interno/acao", { method: "POST", body: enviado }).formData();

    expect(String(recebido.get("corpo"))).toBe(CORPO_ENVIADO);
    expect(String(recebido.get("corpo"))).not.toBe(CORPO_DA_TELA);
  });

  it("com a normalização na entrada, o que a ação lê é o que estava na tela", async () => {
    const enviado = new FormData();
    enviado.set("corpo", CORPO_ENVIADO);

    const recebido = await new Request("http://interno/acao", { method: "POST", body: enviado }).formData();

    expect(campoDeTexto(recebido, "corpo")).toBe(CORPO_DA_TELA);
  });

  it("o selo de \"salvo\" volta a poder ser derivado por igualdade", async () => {
    // Reprodução do defeito: o editor compara o corpo devolvido pelo servidor
    // com o que está na tela. Sem normalizar, a comparação é falsa mesmo tendo
    // gravado certo — que era exatamente o sintoma.
    const enviado = new FormData();
    enviado.set("corpo", CORPO_ENVIADO);
    const recebido = await new Request("http://interno/acao", { method: "POST", body: enviado }).formData();

    const gravadoSemNormalizar = String(recebido.get("corpo") ?? "");
    expect(gravadoSemNormalizar === CORPO_DA_TELA).toBe(false);

    const gravadoComNormalizar = campoDeTexto(recebido, "corpo");
    expect(gravadoComNormalizar === CORPO_DA_TELA).toBe(true);
  });
});
