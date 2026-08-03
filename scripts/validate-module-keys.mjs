// Prevenção executável da VACINA-053-CHAVE-DE-MODULO-INEXISTENTE-NEGA-TODO-MUNDO.md
// e da VACINA-058-ACAO-INEXISTENTE-EM-HAS-MODULE-PERMISSION-NEGA-TODO-MUNDO.md.
//
// Os dois argumentos de `has_module_permission` que negam em silêncio quando
// não existem: a **chave do módulo** e a **ação**.
//
// `has_module_permission(org, 'chave', 'READ')` resolve a chave contra
// `public.app_modules`. Chave que não existe lá **não devolve nível `NONE`** —
// não devolve linha nenhuma, e `bool_or` sobre zero linhas é `false`.
//
// A consequência é a pior possível para quem revisa: o guarda nega **todo
// mundo**, inclusive `SUPER_ADMIN`, e nega em silêncio. Nenhum erro de sintaxe,
// nenhuma reclamação da migration, nenhuma falha de teste — só uma tabela que
// nunca recebe linha, ao lado de telas que gravam normalmente.
//
// Este validador coleta toda chave de módulo citada em SQL e exige que ela
// exista em algum `insert into public.app_modules`.
//
// O caso que motivou: `'dashboard'`. Ele existe em `lib/modules/registry.ts`,
// marcado `system: true`, e por isso parecia o módulo universal — "todo mundo
// tem Início". Só que módulo de sistema não é semeado no banco, e a chave nunca
// existiu em `app_modules`.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const MIGRATIONS = path.join(raiz, "supabase", "migrations");

function sqls() {
  if (!fs.existsSync(MIGRATIONS)) return [];
  return fs
    .readdirSync(MIGRATIONS)
    .filter(nome => nome.endsWith(".sql"))
    .sort()
    .map(nome => ({ nome, texto: fs.readFileSync(path.join(MIGRATIONS, nome), "utf8") }));
}

const arquivos = sqls();

/**
 * Chaves semeadas: primeira coluna de cada tupla do `values`.
 *
 * A varredura é sensível à profundidade de parênteses de propósito. Um regex
 * ingênuo por `('literal',` também casa dentro de `jsonb_build_object(...)`, e
 * `navigationLabel` e `dependencies` entravam no conjunto como se fossem
 * módulos — alargando em silêncio o que o validador aceita, que é o defeito que
 * um validador não pode ter.
 */
function chavesSemeadas(insercao) {
  const chaves = [];
  const valores = /\bvalues\b/i.exec(insercao);
  if (!valores) return chaves;
  const texto = insercao.slice(valores.index + valores[0].length);

  let profundidade = 0;
  let aspas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (aspas) {
      if (c === "'") aspas = texto[i + 1] === "'" ? (i += 1, true) : false;
      continue;
    }
    if (c === "'") { aspas = true; continue; }
    if (c === ")") { profundidade -= 1; continue; }
    if (c !== "(") continue;
    profundidade += 1;
    if (profundidade !== 1) continue;
    // Abriu uma tupla do `values`: a primeira coluna é a chave do módulo.
    const primeira = /^\s*'([a-z0-9_]+)'\s*,/.exec(texto.slice(i + 1));
    if (primeira) chaves.push(primeira[1]);
  }
  return chaves;
}

const semeadas = new Set();
for (const { texto } of arquivos) {
  for (const insercao of texto.matchAll(/insert\s+into\s+public\.app_modules\b([\s\S]*?);/gi)) {
    for (const chave of chavesSemeadas(insercao[1])) semeadas.add(chave);
  }
  // `where m.key='qualidade'` e afins confirmam existência da chave, mas não a
  // criam — não entram como semeadura.
}

/**
 * Vocabulário fechado de ações de `has_module_permission`.
 *
 * O `case` da função resolve estas seis e tem `else false` — **ação que não
 * está aqui nega todo mundo, inclusive SUPER_ADMIN**, sem erro nenhum. Foi o
 * que aconteceu com `'configure'`, que é nome de *capacidade* na camada de
 * aplicação (`lib/authorization.ts` traduz `configure` para a ação
 * `administer`) e não existe como ação no banco.
 *
 * A lista está escrita aqui, e não derivada do SQL, porque a definição de
 * `has_module_permission` **não tem arquivo de migration no repositório**: é
 * uma das 55 aplicações sem arquivo que a S-22 precisa reconstruir. Lida da
 * função real em 03/08/2026. Quando a S-22 devolver a definição para o
 * repositório, esta lista passa a ser derivada dela.
 */
const ACOES = new Set(["approve", "release", "sign", "export", "administer", "sensitive"]);

/** Argumentos de uma chamada, separados no nível de parêntese de fora. */
function argumentosDaChamada(texto, inicio) {
  const argumentos = [];
  let atual = "";
  let profundidade = 0;
  let aspas = false;
  for (let i = inicio; i < texto.length; i += 1) {
    const c = texto[i];
    if (aspas) {
      atual += c;
      if (c === "'") aspas = texto[i + 1] === "'" ? (atual += texto[(i += 1)], true) : false;
      continue;
    }
    if (c === "'") { aspas = true; atual += c; continue; }
    if (c === "(") { profundidade += 1; if (profundidade === 1) continue; }
    if (c === ")") {
      profundidade -= 1;
      if (profundidade === 0) { argumentos.push(atual.trim()); return argumentos; }
    }
    if (c === "," && profundidade === 1) { argumentos.push(atual.trim()); atual = ""; continue; }
    atual += c;
  }
  return argumentos;
}

/**
 * Blocos de definição de função dentro de um arquivo.
 *
 * Serve para saber a **qual** função pertence cada chamada, e é o que permite
 * conferir o estado final em vez do histórico: uma função redefinida por
 * `create or replace` numa migration posterior substitui a anterior, e a
 * versão antiga não existe mais em banco nenhum. Reprovar por ela seria
 * reprovar por um defeito já corrigido — e obrigaria a reescrever migrations
 * já aplicadas, que é justamente o que a VACINA-057 mostra que quebra a
 * reconstrução.
 */
function blocosDeFuncao(texto) {
  const marcas = [...texto.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z0-9_]+)\s*\(/gi)];
  return marcas.map((marca, i) => ({
    nome: marca[1],
    inicio: marca.index,
    fim: i + 1 < marcas.length ? marcas[i + 1].index : texto.length
  }));
}

/* Chaves e ações exigidas: argumentos de has_module_permission em qualquer SQL. */
const ocorrencias = [];
const ultimaDefinicao = new Map();
for (const { nome, texto } of arquivos) {
  const limpo = texto.replace(/--[^\n]*/g, "");
  const blocos = blocosDeFuncao(limpo);
  for (const bloco of blocos) ultimaDefinicao.set(bloco.nome, nome);

  for (const uso of limpo.matchAll(/has_module_permission\s*\(/gi)) {
    const linha = limpo.slice(0, uso.index).split("\n").length;
    const argumentos = argumentosDaChamada(limpo, uso.index + uso[0].length - 1);
    const dentroDe = blocos.find(b => uso.index > b.inicio && uso.index < b.fim);

    ocorrencias.push({
      arquivo: nome,
      linha,
      funcao: dentroDe?.nome ?? null,
      chave: /^'([a-z0-9_]+)'$/.exec(argumentos[1] ?? "")?.[1] ?? null,
      acao: /^'([a-z0-9_]+)'$/.exec(argumentos[4] ?? "")?.[1] ?? null
    });
  }
}

/** Só o que ainda vale: chamada dentro de função redefinida depois não vale mais. */
const vigentes = ocorrencias.filter(
  o => o.funcao === null || ultimaDefinicao.get(o.funcao) === o.arquivo
);

const exigidas = vigentes.filter(o => o.chave).map(o => ({ ...o, chave: o.chave }));
const acoesUsadas = vigentes.filter(o => o.acao).map(o => ({ ...o, acao: o.acao }));

const acoesInvalidas = acoesUsadas.filter(({ acao }) => !ACOES.has(acao));
if (acoesInvalidas.length) {
  console.error("Ações que `has_module_permission` não reconhece:\n");
  for (const { acao, arquivo, linha } of acoesInvalidas) {
    console.error(`  - '${acao}' em ${arquivo}:${linha}`);
  }
  console.error(
    `\nO \`case\` da função tem \`else false\`: ação desconhecida nega todo mundo, inclusive SUPER_ADMIN,\n` +
      `sem erro e sem falha de teste. Ações válidas: ${[...ACOES].sort().join(", ")}.`
  );
  process.exit(1);
}

const problemas = exigidas.filter(({ chave }) => !semeadas.has(chave));

if (problemas.length) {
  const porChave = new Map();
  for (const p of problemas) {
    if (!porChave.has(p.chave)) porChave.set(p.chave, []);
    porChave.get(p.chave).push(`${p.arquivo}:${p.linha}`);
  }
  console.error("Chaves de módulo que nenhum `insert into public.app_modules` cria:\n");
  for (const [chave, ondes] of porChave) {
    console.error(`  - '${chave}' — usada em ${ondes.length} lugar(es): ${ondes.slice(0, 4).join(", ")}`);
  }
  console.error(
    "\nChave inexistente faz `has_module_permission` devolver false para todo mundo, em silêncio.\n" +
      `Chaves semeadas hoje (${semeadas.size}): ${[...semeadas].sort().join(", ")}`
  );
  process.exit(1);
}

console.log(
  `Chaves de módulo conferidas: ${exigidas.length} uso(s) de has_module_permission sobre ` +
    `${semeadas.size} chave(s) semeada(s) em app_modules, nenhuma inexistente. ` +
    `Ações conferidas: ${acoesUsadas.length} uso(s), todas no vocabulário da função.`
);
