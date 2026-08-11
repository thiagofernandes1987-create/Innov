// `Escape` fecha uma camada por vez — VACINA-054.
//
// ## Por que existe
//
// No formulário de nova etapa da EAP, com a lista de sugestões aberta, apertar
// `Escape` — o gesto universal para "não quero esta lista" — fechava a lista
// **e o formulário inteiro**, descartando nome, datas, descrição e sequência.
//
// Duas camadas escutavam a mesma tecla e nenhuma sabia da outra. Os dois
// trechos estavam certos isoladamente: o defeito nasce da composição, e é por
// isso que revisar os arquivos separadamente não encontra — cada diff está
// correto.
//
// O prejuízo é assimétrico. Fechar a lista sem querer custa um clique; fechar o
// formulário sem querer custa todo o preenchimento — e quem apertou `Escape`
// estava justamente sinalizando que queria **continuar** preenchendo.
//
// A vacina declarava prevenção por `verif28.mjs`, arquivo de um arnês que nunca
// foi versionado aqui. Medido em 11/08/2026: não havia portão nenhum.
//
// ## A regra que este portão cobra
//
// **Tratador de tecla no elemento (`onKeyDown` no JSX) que age em `Escape` tem
// de barrar a propagação nesse ramo.** Se ele agiu, consumiu a tecla; deixá-la
// subir é entregar o mesmo gesto a quem está por fora, e quem está por fora
// costuma ser o formulário inteiro.
//
// ## O que fica de fora, e por quê
//
// Ouvinte de `document`/`window` (`addEventListener("keydown", …)`) **não** é
// cobrado: ele é a camada externa, o lado que *sofre* a propagação, não o que a
// causa. Barrar ali seria impedir o comportamento correto — que é justamente o
// segundo `Escape` fechar o formulário.
//
// Medido ao criar: nove componentes tratam `Escape`, **sete** por ouvinte de
// documento e **dois** no elemento. Dos dois, um já barrava.

import fs from "node:fs";
import path from "node:path";
import { encerrar, noEscopo, opcoes } from "./escopo-de-validador.mjs";

const raiz = process.cwd();
const PASTAS = ["app", "components"];

function varrer(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === "node_modules" || entrada.name.startsWith(".")) continue;
    const p = path.join(dir, entrada.name);
    if (entrada.isDirectory()) varrer(p, acc);
    else if (entrada.name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

/**
 * Fim do bloco `{ … }` que começa em `abre`, respeitando literais.
 *
 * O ramo do `Escape` pode ser uma linha sem chaves — `if (…) aoFechar();` — e
 * aí o bloco é a instrução até o `;`. As duas formas contam, porque as duas
 * agem.
 */
function fimDoRamo(texto, abre) {
  if (texto[abre] !== "{") {
    const ponto = texto.indexOf(";", abre);
    return ponto === -1 ? texto.length : ponto + 1;
  }
  let profundidade = 0;
  for (let i = abre; i < texto.length; i++) {
    const ch = texto[i];
    if (ch === "'" || ch === '"' || ch === "`") {
      const aspas = ch;
      i += 1;
      while (i < texto.length && texto[i] !== aspas) {
        if (texto[i] === "\\") i += 1;
        i += 1;
      }
      continue;
    }
    if (ch === "{") profundidade += 1;
    else if (ch === "}") {
      profundidade -= 1;
      if (profundidade === 0) return i + 1;
    }
  }
  return texto.length;
}

const { escopo, json } = opcoes();
const problemas = [];
let noElemento = 0, noDocumento = 0;

for (const pasta of PASTAS) {
  for (const arquivo of noEscopo(varrer(path.join(raiz, pasta)), escopo, c => path.relative(raiz, c))) {
    const texto = fs.readFileSync(arquivo, "utf8");
    const relativo = path.relative(raiz, arquivo);

    for (const achado of texto.matchAll(/\.key\s*===\s*"Escape"\s*\)/g)) {
      // O ouvinte de documento é a camada de fora. Reconhecido pelo
      // `addEventListener` que registra a função onde o teste aparece — ou, o
      // que dá no mesmo e é mais robusto, pela ausência de `onKeyDown` antes
      // dele no mesmo componente.
      const antes = texto.slice(Math.max(0, achado.index - 900), achado.index);
      const noJsx = /onKeyDown\s*=\s*\{[^}]*$|onKeyDown\s*=\s*\{/.test(antes.split(/\n\s*(?:function|const)\s/).pop() ?? antes);
      const ehDocumento = /addEventListener\(\s*"keydown"/.test(texto.slice(achado.index, achado.index + 900))
        || /function\s+\w*escape|function\s+\w*tecla/i.test(antes.slice(-300));

      if (!noJsx || ehDocumento) { noDocumento += 1; continue; }
      noElemento += 1;

      const inicioDoRamo = texto.indexOf(texto.slice(achado.index + achado[0].length).trimStart()[0], achado.index + achado[0].length);
      const ramo = texto.slice(inicioDoRamo, fimDoRamo(texto, inicioDoRamo));
      if (/stopPropagation\(\)/.test(ramo)) continue;

      problemas.push({
        onde: `${relativo}:${texto.slice(0, achado.index).split("\n").length}`,
        o_que: `o ramo age e não barra a propagação: ${ramo.replace(/\s+/g, " ").slice(0, 90)}`
      });
    }
  }
}

encerrar({
  json,
  problemas,
  conferidos: noElemento,
  resumo: "Tratador de `Escape` no elemento que age e deixa a tecla subir (VACINA-054):",
  explicacao:
    "Se o ramo agiu, ele consumiu a tecla. Deixá-la subir entrega o mesmo gesto a quem está por\n" +
    "fora — e por fora costuma estar o formulário inteiro, que fecha levando junto o que a pessoa\n" +
    "acabou de digitar. Acrescente `evento.preventDefault(); evento.stopPropagation();` no ramo,\n" +
    "guardado pela condição que diz que esta camada estava aberta."
});

console.log(
  `Camadas de \`Escape\` conferidas: ${noElemento} tratador(es) no elemento, todos barrando a propagação ` +
    `quando agem; ${noDocumento} ouvinte(s) de documento, que são a camada externa e não são cobrados.`
);
