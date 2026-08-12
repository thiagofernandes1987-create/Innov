// Prevenção declarada por uma vacina tem de existir.
//
// ## Por que existe
//
// Toda vacina fecha com "Prevenção automática" — a seção que diz o que impede a
// causa raiz de voltar. É o que faz um leitor parar de procurar: se está escrito
// que existe portão, ninguém confere.
//
// Medido em 11/08/2026, ao abrir a T-73.3: **duas das 67 vacinas citavam um
// arquivo que não existe**. A VACINA-051 dizia *"`verif26.mjs` no arnês compara,
// na tela de emissão, a contagem de lacunas da prévia com a do documento
// emitido"*; a VACINA-054 dizia o mesmo de `verif28.mjs`. Os dois arquivos
// vieram de um arnês que nunca foi versionado aqui.
//
// O efeito é pior que não ter prevenção nenhuma. A S-73 varreu as 66 vacinas
// para descobrir **quais não tinham portão** e classificou estas duas como
// tendo, porque a seção afirmava que tinham. Uma afirmação falsa numa vacina
// contamina a contagem que decide onde investir.
//
// É a `PROVA-POR-SABOTAGEM` aplicada à documentação: portão que ninguém viu
// reprovar não foi provado — e portão que **não existe** não pode nem ser visto.
//
// ## O que confere
//
// Dentro da seção "Prevenção automática" de cada vacina:
//
//   `pnpm <script>`        o script existe em `package.json`
//   `caminho/arquivo.ext`  o arquivo existe no caminho citado
//   `arquivo.ext`          existe algum arquivo com esse nome no repositório
//
// ## O que não confere
//
// Se o artefato **mede o que promete**. Um script que existe e não testa nada
// passa aqui — é o que a `PROVA-POR-SABOTAGEM.md` cobra por outro caminho, e
// está declarado como limitação em vez de resolvido às escondidas.
//
// Vacina sem a seção também passa: 22 das 67 não a têm, quase todas anteriores à
// convenção. Exigir a seção de todas seria trabalho de outra tarefa, e um portão
// que reprova 22 arquivos no dia em que nasce não é portão, é lista de pendência.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const raiz = process.cwd();
const pasta = path.join(raiz, "diretrizes", "vacinas");
const scripts = JSON.parse(fs.readFileSync(path.join(raiz, "package.json"), "utf8")).scripts;

/**
 * O universo é o que está **versionado**, não o que está no disco.
 *
 * A primeira versão deste portão varria a árvore de trabalho. Passou aqui e
 * reprovou no CI, e a diferença é exatamente o defeito: `.qa/*//*relatorio.json` é
 * saída gerada por `pnpm qa:visual`, existe na máquina de quem já rodou o QA e
 * não existe num checkout limpo. Medir o disco mede quem mediu antes.
 *
 * É a mesma classe de erro que trocou "o banco" por "o repositório" na S-69:
 * medir a coisa parecida em vez da coisa. Prevenção que só existe na máquina de
 * quem a escreveu não é prevenção — e o CI é o único juiz que enxerga isso.
 */
const versionados = new Set();
const nomesNoRepositorio = new Set();
for (const arquivo of execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean)) {
  versionados.add(arquivo);
  nomesNoRepositorio.add(path.basename(arquivo));
}

const vacinas = fs.readdirSync(pasta).filter(f => /^VACINA-\d+.*\.md$/.test(f)).sort();
const problemas = [];
let comSecao = 0, semSecao = 0, citacoes = 0;

for (const nome of vacinas) {
  const texto = fs.readFileSync(path.join(pasta, nome), "utf8");
  // `matchAll`, não `exec`: um arquivo pode ter mais de uma seção com esse
  // título — e a primeira sabotagem deste portão descobriu exatamente isso.
  // Inserida uma segunda seção falsa depois da verdadeira, o portão passou,
  // porque só lia a primeira. Portão que lê só o começo do arquivo é portão que
  // qualquer acréscimo no fim contorna.
  const secoes = [...texto.matchAll(/##\s+Preven(?:ç|c)[ãa]o autom[áa]tica([\s\S]*?)(?=\n##\s|$)/gi)];
  if (!secoes.length) { semSecao += 1; continue; }
  comSecao += 1;

  const corpo = secoes.map(s => s[1]).join("\n");
  const linhaDaSecao = texto.slice(0, secoes[0].index).split("\n").length;

  /**
   * Citação datada é registro, não promessa.
   *
   * A correção da VACINA-051 **cita `verif26.mjs` de propósito**, para explicar
   * que a seção antiga afirmava algo falso. Cobrar a existência dele aí seria
   * cobrar que o passado se atualize — e a alternativa, apagar a menção,
   * apagaria justamente a prova de que a afirmação existiu.
   *
   * A isenção é a mesma do `validate:numeros-afirmados`: data no entorno separa
   * registro de afirmação. Quem escreve "até 11/08/2026 esta seção dizia X" está
   * historiando; quem escreve "X previne isto" está prometendo.
   */
  const datado = trecho => /\d{2}\/\d{2}\/\d{4}|\b\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4}\b/i.test(trecho);
  const entorno = achado => corpo.slice(Math.max(0, achado.index - 240), achado.index + 240);

  for (const achado of corpo.matchAll(/`pnpm\s+([a-z0-9:_-]+)`/gi)) {
    citacoes += 1;
    if (scripts[achado[1]] || datado(entorno(achado))) continue;
    problemas.push({
      nome,
      linha: linhaDaSecao,
      citado: `pnpm ${achado[1]}`,
      o_que: "não é script de `package.json`"
    });
  }

  for (const achado of corpo.matchAll(/`([a-z0-9_./-]+\.(?:mjs|ts|tsx|js|sql|json|yml))`/gi)) {
    citacoes += 1;
    const citado = achado[1];
    const existe = citado.includes("/") ? versionados.has(citado) : nomesNoRepositorio.has(citado);
    if (existe || datado(entorno(achado))) continue;
    problemas.push({
      nome,
      linha: linhaDaSecao,
      citado,
      o_que: citado.includes("/")
        ? "esse caminho não está versionado"
        : "nenhum arquivo versionado com esse nome"
    });
  }
}

if (problemas.length) {
  console.error("Vacina declarando prevenção que não existe:\n");
  for (const p of problemas) {
    console.error(`  diretrizes/vacinas/${p.nome}:${p.linha} — cita \`${p.citado}\`, e ${p.o_que}`);
  }
  console.error(
    "\nPrevenção declarada e ausente é pior que prevenção nenhuma: quem lê para de procurar, e a\n" +
      "varredura que conta \"quantas vacinas têm portão\" conta esta como tendo. Ou o artefato entra no\n" +
      "repositório, ou a seção passa a dizer o que é verdade — que a conferência ainda é humana."
  );
  process.exit(1);
}

console.log(
  `Prevenção declarada conferida: ${vacinas.length} vacina(s), ${comSecao} com seção "Prevenção automática" ` +
    `e ${semSecao} sem; ${citacoes} artefato(s) citado(s) — todos existem.`
);
