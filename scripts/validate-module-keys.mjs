// Prevenção executável da VACINA-053-CHAVE-DE-MODULO-INEXISTENTE-NEGA-TODO-MUNDO.md.
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

/* Chaves exigidas: segundo argumento de has_module_permission em qualquer SQL. */
const exigidas = [];
for (const { nome, texto } of arquivos) {
  const limpo = texto.replace(/--[^\n]*/g, "");
  for (const uso of limpo.matchAll(/has_module_permission\s*\(\s*[^,]+,\s*'([a-z0-9_]+)'/gi)) {
    const linha = limpo.slice(0, uso.index).split("\n").length;
    exigidas.push({ chave: uso[1], arquivo: nome, linha });
  }
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
    `${semeadas.size} chave(s) semeada(s) em app_modules, nenhuma inexistente.`
);
