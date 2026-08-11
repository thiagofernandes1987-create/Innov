// Pareto sobre as ocorrências de erro registradas.
//
// Por que separado das vacinas. `VACINAS.md` cataloga cada causa-raiz **uma
// vez**; `REGISTRO-DE-ERROS.json` registra cada **acontecimento**, inclusive
// repetido. Frequência é o eixo do Pareto, e ela não existe num catálogo de
// causas únicas — lá tudo tem frequência 1 por construção.
//
// O que este relatório decide: quais famílias concentram o custo, e portanto
// quais itens merecem ser promovidos a portão ou a item do checklist universal.
//
// Uso: node scripts/pareto-de-erros.mjs

import fs from "node:fs";

const arquivo = "diretrizes/REGISTRO-DE-ERROS.json";
if (!fs.existsSync(arquivo)) {
  console.error(`Registro de erros ausente: ${arquivo}`);
  process.exit(1);
}

const { ocorrencias } = JSON.parse(fs.readFileSync(arquivo, "utf8"));
if (!ocorrencias?.length) {
  console.log("Nenhuma ocorrência registrada ainda.");
  process.exit(0);
}

/**
 * Peso por custo.
 *
 * Pareto por contagem pura trata um falso negativo que escondeu dois achados de
 * segurança igual a um regex com acento errado. O peso existe para que a ordem
 * reflita o que doeu, não o que foi frequente — e a contagem continua ao lado,
 * porque as duas leituras discordam com frequência e a discordância é
 * informação.
 */
const PESO = { baixo: 1, medio: 3, alto: 9 };

const porFamilia = new Map();
for (const o of ocorrencias) {
  if (!porFamilia.has(o.familia)) porFamilia.set(o.familia, { n: 0, peso: 0, semPortao: 0, itens: [] });
  const f = porFamilia.get(o.familia);
  f.n += 1;
  f.peso += PESO[o.custo] ?? 1;
  if (!o.tinha_portao) f.semPortao += 1;
  f.itens.push(o);
}

const linhas = [...porFamilia.entries()].sort((a, b) => b[1].peso - a[1].peso);
const pesoTotal = linhas.reduce((s, [, f]) => s + f.peso, 0);

console.log(`Ocorrências registradas: ${ocorrencias.length}\n`);
console.log("família         n   peso   %peso  acum.  sem portão");
let acum = 0;
for (const [nome, f] of linhas) {
  const pct = (f.peso / pesoTotal) * 100;
  acum += pct;
  console.log(
    nome.padEnd(14) +
      String(f.n).padStart(3) +
      String(f.peso).padStart(7) +
      (pct.toFixed(0) + "%").padStart(7) +
      (acum.toFixed(0) + "%").padStart(7) +
      String(f.semPortao).padStart(11)
  );
}

/** A regra de Pareto: quem entra nos primeiros 80% do peso acumulado. */
let corte = 0;
const vitais = [];
for (const [nome, f] of linhas) {
  if (corte >= 80) break;
  corte += (f.peso / pesoTotal) * 100;
  vitais.push(nome);
}

console.log(`\nPoucas vitais (80% do peso): ${vitais.join(", ")}`);

const semPortao = ocorrencias.filter(o => !o.tinha_portao);
console.log(
  `Sem portão: ${semPortao.length} de ${ocorrencias.length} ` +
    `(${((semPortao.length / ocorrencias.length) * 100).toFixed(0)}%)`
);

const altos = ocorrencias.filter(o => o.custo === "alto");
console.log(`\nCusto alto — ${altos.length}, e é aqui que a promoção a portão se decide:`);
for (const o of altos) console.log(`  [${o.familia}] ${o.o_que.slice(0, 96)}`);

const porDetector = new Map();
for (const o of ocorrencias) porDetector.set(o.detectado_por, (porDetector.get(o.detectado_por) ?? 0) + 1);
console.log("\nQuem pegou:");
for (const [k, v] of [...porDetector.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(3)}  ${k}`);
}
