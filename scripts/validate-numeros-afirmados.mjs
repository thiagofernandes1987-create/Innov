// Número afirmado em documento canônico tem de bater com o repositório.
//
// Por que existe. Documentação canônica cita quantidade medida — "25 módulos",
// "66 vacinas", "43 validadores" — e a quantidade muda com o trabalho. O texto
// não muda junto, e o número envelhece em silêncio: continua parecendo medição
// e passa a ser lembrança.
//
// Medido em 11/08/2026, antes deste portão existir: **cinco documentos afirmavam
// "54 validadores"**, entre eles o `CLAUDE.md`, que é lido no início de toda
// sessão assistida. O real era 43. E os documentos discordavam entre si — 54,
// 43, 42, 41 e 17 apareciam ao mesmo tempo no repositório.
//
// Número errado em documento canônico é pior que número ausente: quem lê "54
// validadores" e roda 43 conclui que faltam 11, e vai procurar o que não existe.
// Foi por isso que este portão entrou junto do pedido de manter a documentação
// sempre atualizada.
//
// O que confere e o que não confere:
//
//   confere    : as quantidades declaradas em AFIRMACOES abaixo, onde quer que
//                apareçam nos documentos canônicos
//   não confere: número que ninguém declarou aqui. Este portão não adivinha o
//                que um número no texto significa — a lista é curada de
//                propósito, e cresce quando alguém acrescenta uma medição que
//                vale a pena proteger.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const leia = p => fs.readFileSync(path.join(raiz, p), "utf8");

/** Documentos onde um número afirmado é contrato, não prosa. */
const DOCUMENTOS = [
  "CLAUDE.md",
  ...fs
    .readdirSync(path.join(raiz, "diretrizes"))
    .filter(f => f.endsWith(".md"))
    .map(f => path.join("diretrizes", f))
];

/**
 * Cada afirmação: como encontrá-la no texto e como medi-la no repositório.
 *
 * `padrao` precisa capturar o número no grupo 1. `medir` devolve a verdade.
 */
const AFIRMACOES = [
  {
    nome: "validadores",
    padrao: /(\d+)\s+validadores/gi,
    medir: () => Object.keys(JSON.parse(leia("package.json")).scripts).filter(k => k.startsWith("validate:")).length
  },
  {
    nome: "vacinas",
    padrao: /(\d+)\s+(?:vacinas|causas-raiz)\b/gi,
    medir: () => fs.readdirSync(path.join(raiz, "diretrizes", "vacinas")).filter(f => /^VACINA-\d+.*\.md$/.test(f)).length
  },
  {
    nome: "módulos no registry",
    padrao: /(\d+)\s+módulos\s+no\s+registry/gi,
    medir: () => [...leia("lib/modules/registry.ts").matchAll(/\{\s*key:"[a-z_]+"/g)].length
  },
  // `sprints` e `Marcos` foram tentados como afirmações e **retirados no mesmo
  // dia**, 11/08/2026. Em prosa eles não são contáveis com precisão: "17 de 25
  // módulos em 4 sprints ou mais" e "### 7.4 Sprints W-19 a W-22" casavam como
  // se fossem contagem, e a medição de Marcos contava 41 porque a tabela de
  // bloqueio da S-69 usa linhas com a mesma forma do registro.
  //
  // Três acusações falsas em cinco. Portão que erra assim gasta a confiança de
  // quem o lê, e um portão em que ninguém confia é pior que portão nenhum —
  // porque dá a impressão de proteção. Quem quiser proteger estes dois números
  // precisa primeiro de uma forma inequívoca de escrevê-los no texto.
  {
    nome: "destinos de menu",
    padrao: /(\d+)\s+destinos\s+de\s+menu/gi,
    medir: () => [...leia("lib/casca/menus.ts").matchAll(/href:\s*"/g)].length
  }
];

const problemas = [];
let conferidas = 0;

for (const afirmacao of AFIRMACOES) {
  const real = afirmacao.medir();
  for (const doc of DOCUMENTOS) {
    const texto = leia(doc);
    for (const achado of texto.matchAll(afirmacao.padrao)) {
      const dito = Number(achado[1]);
      if (dito === real) {
        conferidas += 1;
        continue;
      }

      // Medição datada não envelhece.
      //
      // Sprint concluída que registra "41 validadores verdes" é **prova do que
      // aconteceu naquele dia**. Corrigir para o número de hoje falsificaria o
      // registro — e registro falsificado é pior que registro velho, porque
      // ninguém mais sabe o que foi realmente medido.
      //
      // A isenção é por data no entorno, e é ela que separa afirmação de
      // registro: quem quiser citar um número antigo escreve a data ao lado, e
      // o portão para de cobrar. Quem afirma sem data está dizendo "é assim
      // agora", e aí o número tem de bater.
      // Documento com data no nome é datado por construção: um relatório
      // chamado `...-2026-07-28.md` é o retrato daquele dia, e cobrar dele o
      // número de hoje é pedir que o passado se atualize.
      if (/\d{4}-\d{2}-\d{2}/.test(doc)) {
        conferidas += 1;
        continue;
      }

      const entorno = texto.slice(Math.max(0, achado.index - 240), achado.index + 240);
      if (/\d{2}\/\d{2}\/\d{4}|\b\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4}\b|\bS-\d+\b/i.test(entorno)) {
        conferidas += 1;
        continue;
      }

      conferidas += 1;
      const linha = texto.slice(0, achado.index).split("\n").length;
      problemas.push({ doc, linha, nome: afirmacao.nome, dito, real, trecho: achado[0] });
    }
  }
}

/**
 * Documento que se contradiz na própria data.
 *
 * `MODULOS.md` e `INVENTARIO.md` carregavam **duas** linhas "Atualizado em",
 * com datas diferentes — 04 e 9 de agosto —, porque alguém acrescentou a nova
 * sem apagar a velha. Quem lê não sabe qual vale, e a mais antiga é a que
 * aparece primeiro.
 */
for (const doc of DOCUMENTOS) {
  const texto = leia(doc);
  const datas = [...texto.matchAll(/^\*\*Atualizado em:?\*\*\s*(.+?)\s*$/gim)];
  if (datas.length > 1) {
    problemas.push({
      doc,
      linha: texto.slice(0, datas[1].index).split("\n").length,
      nome: "data de atualização",
      dito: datas.map(d => d[1].trim()).join(" / "),
      real: "uma só",
      trecho: `${datas.length} linhas "Atualizado em"`
    });
  }
}

if (problemas.length) {
  console.error("Números afirmados em documento canônico que não batem com o repositório:\n");
  for (const p of problemas) {
    console.error(`  ${p.doc}:${p.linha} — diz "${p.trecho.trim()}", o real é ${p.real}`);
  }
  console.error(
    "\nNúmero errado em documento canônico é pior que número ausente: quem lê e mede a diferença\n" +
      "conclui que falta o que não existe. Corrija o texto, ou — se a citação for histórica —\n" +
      "escreva a data ao lado dela, porque medição datada não envelhece."
  );
  process.exit(1);
}

console.log(
  `Números afirmados conferidos: ${conferidas} citação(ões) em ${DOCUMENTOS.length} documento(s), ` +
    `sobre ${AFIRMACOES.length} medição(ões) — todas batem com o repositório.`
);
