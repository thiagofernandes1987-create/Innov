// Cruza o catálogo de módulos do código com a semeadura em `app_modules`,
// com os menus e com o roteador.
//
// Por que este portão existe, sendo que `validate:module-keys` já existe:
// aquele valida a direção "chave usada em SQL precisa estar semeada". Ele parte
// do SQL. Módulo declarado em `lib/modules/registry.ts` que **ainda não é citado
// por nenhuma policy** passa por ele sem uma linha de reclamação — e é
// exatamente esse o buraco por onde o RH entrou.
//
// O RH foi declarado no registry em 07/08/2026, com rota, menu e 57 páginas. A
// semeadura em `app_modules` só chegou em `20260809141000_rh_module_catalog_seed`,
// dois dias depois. No intervalo, num ambiente nascido apenas das migrations, o
// aplicativo existia inteiro no código e não existia para nenhum usuário:
// `list_my_modules` lê `app_modules`, a chave não estava lá, e a central de
// aplicativos simplesmente não mostrava o RH. Sem erro de compilação, sem
// migration reclamando, sem teste vermelho — o mesmo silêncio da VACINA-053.
//
// As quatro direções conferidas, e o que cada uma significa quando quebra:
//
//   A. registry -> app_modules  : aplicativo que nenhum usuário alcança.
//   B. app_modules -> registry  : linha de catálogo sem rota para onde levar.
//   C. menus -> registry        : menu que nunca é renderizado (chave morta).
//   D. registry -> menus        : aplicativo sem navegação interna.
//
// Nenhuma delas é pega por `tsc`: as três fontes são arquivos diferentes, cada
// um coerente consigo mesmo.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const MIGRATIONS = path.join(raiz, "supabase", "migrations");

/**
 * Módulos que existem no registry e **não devem** ser semeados, com o motivo.
 *
 * A lista é curta de propósito. Ela não é um lugar para calar o portão: cada
 * entrada precisa de um motivo que explique por que o módulo não é um
 * aplicativo instalável. Chave que entra aqui continua proibida de aparecer
 * como argumento de `has_module_permission` — quem cobre esse lado é o
 * `validate:module-keys`, e foi assim que a VACINA-053 nasceu.
 */
const NAO_SEMEADOS = new Map([
  [
    "dashboard",
    "Não é aplicativo instalável: é a própria central de aplicativos. Semear " +
      "criaria um item que se lista dentro de si mesmo. Usar esta chave como " +
      "argumento de permissão nega todo mundo (VACINA-053)."
  ]
]);

function ler(relativo) {
  const absoluto = path.join(raiz, relativo);
  if (!fs.existsSync(absoluto)) {
    console.error(`Arquivo obrigatório ausente: ${relativo}`);
    process.exit(1);
  }
  return fs.readFileSync(absoluto, "utf8");
}

/* ---------------------------------------------------------------- registry */

const fonteRegistry = ler("lib/modules/registry.ts");
const registry = [...fonteRegistry.matchAll(/\{\s*key\s*:\s*"([a-z0-9_]+)"[\s\S]*?\}/g)]
  .map(achado => ({
    chave: achado[1],
    rota: /routePrefix\s*:\s*"([^"]+)"/.exec(achado[0])?.[1] ?? null,
    sistema: /\bsystem\s*:\s*true/.test(achado[0])
  }))
  .filter(item => item.rota);

if (registry.length === 0) {
  console.error("Nenhum módulo lido de lib/modules/registry.ts — o parser quebrou.");
  process.exit(1);
}

/* ----------------------------------------------------------- app_modules */

/**
 * Chaves semeadas: primeira coluna de cada tupla do `values`.
 *
 * A varredura é sensível à profundidade de parênteses pelo mesmo motivo do
 * `validate:module-keys`: um regex ingênuo por `('literal',` também casa dentro
 * de `jsonb_build_object(...)`, e `dependencies` entraria no conjunto como se
 * fosse módulo, alargando em silêncio o que o portão aceita.
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
    const primeira = /^\s*'([a-z0-9_]+)'\s*,/.exec(texto.slice(i + 1));
    if (primeira) chaves.push(primeira[1]);
  }
  return chaves;
}

const semeadas = new Map();
if (fs.existsSync(MIGRATIONS)) {
  for (const nome of fs.readdirSync(MIGRATIONS).filter(n => n.endsWith(".sql")).sort()) {
    const texto = fs.readFileSync(path.join(MIGRATIONS, nome), "utf8").replace(/--[^\n]*/g, "");
    for (const insercao of texto.matchAll(/insert\s+into\s+public\.app_modules\b([\s\S]*?);/gi)) {
      for (const chave of chavesSemeadas(insercao[1])) {
        if (!semeadas.has(chave)) semeadas.set(chave, nome);
      }
    }
  }
}

/* ---------------------------------------------------------------- menus */

const fonteMenus = ler("lib/casca/menus.ts");
const corpoMenus = fonteMenus.slice(fonteMenus.indexOf("MENUS_DO_MODULO"));
const chavesDeMenu = new Set([...corpoMenus.matchAll(/^ {2}([a-z0-9_]+)\s*:\s*\[/gm)].map(m => m[1]));

/* ---------------------------------------------------------------- rotas */

const semRota = registry.filter(item => !fs.existsSync(path.join(raiz, "app", item.rota.replace(/^\//, ""))));

/* -------------------------------------------------------------- conferência */

const problemas = [];

for (const item of registry) {
  if (semeadas.has(item.chave)) {
    if (NAO_SEMEADOS.has(item.chave)) {
      problemas.push(
        `'${item.chave}' está na lista de não semeados e mesmo assim é semeado em ` +
          `${semeadas.get(item.chave)}. A lista ou a migration está errada — não as duas.`
      );
    }
    continue;
  }
  if (NAO_SEMEADOS.has(item.chave)) continue;
  problemas.push(
    `[A] '${item.chave}' existe em lib/modules/registry.ts (rota ${item.rota}) e nenhuma migration ` +
      `o insere em public.app_modules. list_my_modules lê app_modules: o aplicativo não aparece ` +
      `para usuário nenhum, e has_module_permission nega todo mundo, em silêncio (VACINA-053).`
  );
}

for (const [chave, migration] of semeadas) {
  if (registry.some(item => item.chave === chave)) continue;
  problemas.push(
    `[B] '${chave}' é semeado em public.app_modules por ${migration} e não existe em ` +
      `lib/modules/registry.ts. É linha de catálogo sem rota: aparece na central e não leva a lugar nenhum.`
  );
}

for (const chave of chavesDeMenu) {
  if (registry.some(item => item.chave === chave)) continue;
  problemas.push(
    `[C] '${chave}' tem menu em lib/casca/menus.ts e não é chave de módulo do registry. ` +
      `A navegação resolve o módulo por moduleForPath(), que devolve a chave do registry — ` +
      `esta entrada nunca é renderizada.`
  );
}

for (const item of registry) {
  if (item.sistema || chavesDeMenu.has(item.chave)) continue;
  problemas.push(
    `[D] '${item.chave}' não tem menu em lib/casca/menus.ts. O aplicativo abre e a barra ` +
      `superior fica sem navegação interna (VACINA-028).`
  );
}

for (const item of semRota) {
  problemas.push(`[E] '${item.chave}' aponta para ${item.rota} e não existe pasta correspondente em app/.`);
}

if (problemas.length) {
  console.error("Catálogo de módulos divergente entre código, banco e navegação:\n");
  for (const problema of problemas) console.error(`  - ${problema}`);
  console.error(
    `\nRegistry: ${registry.length} módulo(s). Semeados em app_modules: ${semeadas.size}. ` +
      `Menus: ${chavesDeMenu.size}. Não semeados por decisão: ${[...NAO_SEMEADOS.keys()].join(", ")}.`
  );
  process.exit(1);
}

console.log(
  `Catálogo de módulos conferido: ${registry.length} módulo(s) no registry, ` +
    `${semeadas.size} semeado(s) em app_modules, ${chavesDeMenu.size} com menu, ` +
    `${registry.length - semRota.length} com rota no roteador. ` +
    `Não semeados por decisão declarada: ${[...NAO_SEMEADOS.keys()].join(", ")}.`
);
