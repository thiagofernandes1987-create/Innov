import { describe, expect, it } from "vitest";
import { pertenceALista, type ItemDeLista } from "../lib/listas/servidor";

const item = (rotulo: string, chave: string, posicao: number, ativo = true): ItemDeLista => ({
  id: `id-${posicao}`,
  rotulo,
  chave,
  posicao,
  ativo
});

const MOTIVOS = [
  item("Parou de responder", "parou de responder", 10),
  item("Praça errada", "praca errada", 20),
  item("Produto errado", "produto errado", 30)
];

describe("motivo escolhido pertence à lista", () => {
  it("aceita o que está cadastrado", () => {
    expect(pertenceALista(MOTIVOS, "Parou de responder")).toBe(true);
    expect(pertenceALista(MOTIVOS, "Produto errado")).toBe(true);
  });

  it("recusa o que não está — é o que protege a contagem", () => {
    // Um POST montado à mão gravaria qualquer texto em `lost_reason`, que é
    // justamente a coluna que precisa ser contável. O `required` do rádio
    // protege a tela; esta regra protege o dado.
    expect(pertenceALista(MOTIVOS, "cliente sumiu")).toBe(false);
    expect(pertenceALista(MOTIVOS, "Parou de responder ao telefone")).toBe(false);
  });

  it("a comparação é pela chave normalizada, como no resto do produto", () => {
    // Quem cola "PRAÇA ERRADA" de uma planilha escolheu a opção que existe.
    expect(pertenceALista(MOTIVOS, "PRAÇA ERRADA")).toBe(true);
    expect(pertenceALista(MOTIVOS, "  praca   errada  ")).toBe(true);
  });

  it("vazio nunca pertence", () => {
    expect(pertenceALista(MOTIVOS, "")).toBe(false);
    expect(pertenceALista(MOTIVOS, "   ")).toBe(false);
  });

  it("lista vazia recusa tudo, inclusive texto plausível", () => {
    // Sem motivo cadastrado a perda não é registrável, e a tela diz onde
    // cadastrar. Aceitar "qualquer coisa porque não há lista" seria voltar ao
    // texto livre justamente quando ninguém está olhando.
    expect(pertenceALista([], "Parou de responder")).toBe(false);
  });

  it("item fora de circulação não é oferecido, mas a regra é da lista recebida", () => {
    // Quem chama decide se manda ativos ou todos. A tela de escolha manda só
    // ativos; um relatório histórico pode querer todos — e aí o motivo antigo
    // continua válido, que é o motivo de desativar em vez de excluir.
    const comInativo = [...MOTIVOS, item("Sem verba", "sem verba", 40, false)];
    expect(pertenceALista(MOTIVOS, "Sem verba")).toBe(false);
    expect(pertenceALista(comInativo, "Sem verba")).toBe(true);
  });
});
