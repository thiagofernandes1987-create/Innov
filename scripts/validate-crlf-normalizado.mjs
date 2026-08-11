// Texto multilinha vindo de `FormData` tem de ser normalizado na entrada.
//
// ## Por que existe
//
// A VACINA-048 escreveu a regra em julho: *todo texto multilinha vindo de
// `FormData` é normalizado para `\n` na entrada*. A prevenção que ela declarou
// era humana — abrir o editor de modelo, salvar, olhar se o selo fica verde.
//
// Medido em 11/08/2026, ao criar este portão: a regra valia em **um** lugar do
// repositório. `app/actions` tinha **62 arquivos** com a sua própria cópia de
// `String(dados.get(chave) ?? "").trim()`, e nenhuma delas normalizava. O
// `.trim()` não resolve — ele tira espaço das pontas e deixa intacto o `\r\n`
// do meio, que é justamente onde ele está.
//
// A T-73.2 da S-73 pediu que essa conferência virasse teste. O teste está em
// `tests/formulario-campos.test.ts` e prova que a função normaliza. Este portão
// é a outra metade: prova que **todo mundo passa por ela**.
//
// ## O que ele confere
//
//   1. Nenhum leitor genérico de `FormData` em `app/actions` lê cru. Leitor
//      genérico é `String(x.get(y) ?? "")` com `y` variável — a assinatura do
//      helper duplicado. Quem escrever a 63ª cópia reprova aqui.
//
//   2. Todo campo que **alguma tela envia como `<textarea>`** e que a ação lê
//      com chave literal é normalizado nessa leitura.
//
// ## O que ele deliberadamente não confere
//
// Campo de uma linha. `<input>` não produz CRLF, e cobrar normalização dele
// transformaria o portão em ruído — a lista de acusações passaria a ser maior
// que a de defeitos, e portão em que ninguém confia é pior que portão nenhum.
//
// O par tela→ação é medido pelo `<form action={…}>`, **não pelo nome do
// campo**. Medir por nome erra: `reason` é `<input>` numa tela e `<textarea>`
// noutra, e a primeira versão desta medição acusou por causa disso.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();

function varrer(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entrada.name)) continue;
    const p = path.join(dir, entrada.name);
    if (entrada.isDirectory()) varrer(p, acc);
    else if (/\.tsx?$/.test(entrada.name)) acc.push(p);
  }
  return acc;
}

const NORMALIZA = /campoDeTexto\(|replace\(\s*\/\\r\\n\??\/g/;
const problemas = [];

// ---------------------------------------------------------------------------
// 1. Leitor genérico que lê cru — a 63ª cópia do helper.
// ---------------------------------------------------------------------------

const CRU_GENERICO = /String\(\s*(\w+)\.get\(\s*(\w+)\s*\)\s*\?\?\s*""\s*\)/g;
const acoes = varrer(path.join(raiz, "app", "actions"));
let helpersConferidos = 0;

for (const arquivo of acoes) {
  const texto = fs.readFileSync(arquivo, "utf8");
  for (const achado of texto.matchAll(CRU_GENERICO)) {
    problemas.push({
      arquivo: path.relative(raiz, arquivo),
      linha: texto.slice(0, achado.index).split("\n").length,
      o_que: `leitor genérico de FormData lê cru: \`${achado[0]}\``,
      como: "troque por `campoDeTexto(dados, chave)` de `@/lib/forms/campos`"
    });
  }
}

// ---------------------------------------------------------------------------
// 2. Campo enviado como `<textarea>` e lido com chave literal sem normalizar.
// ---------------------------------------------------------------------------

/** ação -> Set(campo multilinha que alguma tela envia para ela) */
const multilinhaPorAcao = new Map();
/** ação -> Set("arquivo:linha" da tela) */
const telasPorAcao = new Map();

for (const arquivo of [...varrer(path.join(raiz, "app")), ...varrer(path.join(raiz, "components"))]) {
  const texto = fs.readFileSync(arquivo, "utf8");
  const relativo = path.relative(raiz, arquivo);

  // `action={gravar}` raramente nomeia a ação: o editor liga por
  // `const [estado, gravar] = useActionState(salvarModelo, …)`. Sem desfazer
  // esse apelido, o portão passaria por cima justamente do caso que originou a
  // VACINA-048 — o editor de modelo — e nasceria verde por não enxergar nada.
  const apelidos = new Map();
  for (const ligacao of texto.matchAll(
    /\[\s*\w+\s*,\s*(\w+)\s*(?:,\s*\w+\s*)?\]\s*=\s*useActionState\(\s*([A-Za-z_$][\w$]*)/g
  )) {
    apelidos.set(ligacao[1], ligacao[2]);
  }

  for (const abre of texto.matchAll(/<form\b[^>]*?\baction=\{([A-Za-z_$][\w$]*)\}/g)) {
    const fim = texto.indexOf("</form>", abre.index);
    const corpo = texto.slice(abre.index, fim === -1 ? texto.length : fim);
    const campos = [...corpo.matchAll(/<(?:textarea|Textarea)\b([\s\S]{0,400}?)\/?>/gi)]
      .map(m => /\bname\s*=\s*"([^"]+)"/.exec(m[1])?.[1])
      .filter(Boolean);
    if (!campos.length) continue;
    const acao = apelidos.get(abre[1]) ?? abre[1];
    if (!multilinhaPorAcao.has(acao)) {
      multilinhaPorAcao.set(acao, new Set());
      telasPorAcao.set(acao, new Set());
    }
    for (const campo of campos) multilinhaPorAcao.get(acao).add(campo);
    telasPorAcao.get(acao).add(`${relativo}:${texto.slice(0, abre.index).split("\n").length}`);
  }
}

let literaisConferidos = 0;

for (const [acao, campos] of multilinhaPorAcao) {
  for (const arquivo of acoes) {
    const texto = fs.readFileSync(arquivo, "utf8");
    const declaracao = new RegExp(`export\\s+(?:async\\s+)?function\\s+${acao}\\b`).exec(texto);
    if (!declaracao) continue;

    const resto = texto.slice(declaracao.index);
    const proxima = /\nexport\s+(?:async\s+)?function\s/.exec(resto.slice(1));
    const corpo = resto.slice(0, proxima ? proxima.index + 1 : resto.length);

    for (const campo of campos) {
      const literal = campo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Duas formas de ler com chave literal: a crua `.get("campo")` e a
      // normalizada `campoDeTexto(dados, "campo")`. As duas contam como leitura
      // conferida — contar só a crua faria o número cair para zero assim que o
      // último caso fosse corrigido, e a conferência passaria a não medir nada.
      const leitura = new RegExp(
        `(?:\\.get\\(\\s*"${literal}"\\s*\\)|campoDeTexto\\(\\s*\\w+\\s*,\\s*"${literal}"\\s*\\))`
      ).exec(corpo);
      if (!leitura) continue; // lido por helper — já coberto pela conferência 1
      literaisConferidos += 1;
      const janela = corpo.slice(Math.max(0, leitura.index - 160), leitura.index + 240);
      if (NORMALIZA.test(janela)) continue;
      problemas.push({
        arquivo: path.relative(raiz, arquivo),
        linha: texto.slice(0, declaracao.index).split("\n").length + corpo.slice(0, leitura.index).split("\n").length - 1,
        o_que: `\`${acao}\` lê "${campo}" com chave literal e sem normalizar, e a tela manda como <textarea>`,
        como: `troque por \`campoDeTexto(dados, "${campo}")\`; tela em ${[...telasPorAcao.get(acao)].join(", ")}`
      });
    }
    break;
  }
}

helpersConferidos = acoes.length;

if (problemas.length) {
  console.error("Texto de formulário lido sem normalizar a quebra de linha (VACINA-048):\n");
  for (const p of problemas) {
    console.error(`  ${p.arquivo}:${p.linha} — ${p.o_que}`);
    console.error(`      ${p.como}`);
  }
  console.error(
    "\nO envio de formulário normaliza a quebra de linha do `<textarea>` para CRLF: o valor da tela\n" +
      "usa `\\n` e o que chega ao servidor usa `\\r\\n`. Gravar assim guarda um caractere que nenhum\n" +
      "`diff` mostra, faz toda comparação por igualdade falhar e marca todas as linhas como alteradas\n" +
      "na próxima versão. `.trim()` não resolve — o `\\r\\n` está no meio, não nas pontas."
  );
  process.exit(1);
}

console.log(
  `Entrada de formulário conferida: ${helpersConferidos} arquivo(s) em \`app/actions\`, nenhum leitor genérico ` +
    `de FormData lendo cru; ${multilinhaPorAcao.size} ação(ões) recebem <textarea> por <form action={…}>, ` +
    `${literaisConferidos} leitura(s) com chave literal — todas normalizam.`
);
