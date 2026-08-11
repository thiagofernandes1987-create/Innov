// Responde, por módulo, o que já dá para responder por medição.
//
// Por que existe. O repositório tem 42 validadores e todos respondem
// **globalmente**: "nenhum export morto no projeto", "todos os menus têm
// página". Nenhum deles responde a pergunta que decide um Marco — *este
// módulo está pronto?*. Sem essa pergunta, a conclusão de módulo virava um
// texto novo escrito à mão a cada vez, e por isso nunca houve checklist.
//
// O contrato do que se pergunta está em
// `diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md`, e é o mesmo para todos os
// módulos. Este script responde os itens **mecânicos**; os demais exigem
// verificação humana e saem marcados como tal — nunca como aprovados.
//
// Uso: node scripts/checklist-de-modulo.mjs <chave>   (ou sem chave: todos)

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const leia = p => fs.readFileSync(path.join(raiz, p), "utf8");
const MIGRATIONS = path.join(raiz, "supabase", "migrations");

/** Todo o SQL, sem comentário: comentário não cria coluna nem concede grant. */
const sql = fs
  .readdirSync(MIGRATIONS)
  .filter(n => n.endsWith(".sql"))
  .sort()
  .map(n => fs.readFileSync(path.join(MIGRATIONS, n), "utf8"))
  .join("\n")
  .replace(/--[^\n]*/g, "");

/** Todo o código do produto — o que importa é onde uma coluna é lida ou escrita. */
const codigo = [];
(function ler(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!/node_modules|\.next|\.git/.test(p)) ler(p);
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      codigo.push(fs.readFileSync(p, "utf8"));
    }
  }
})(raiz);
const codigoInteiro = codigo.join("\n");

const registry = leia("lib/modules/registry.ts");
const modulos = [...registry.matchAll(/\{\s*key:"([a-z_]+)",\s*name:"([^"]+)"[^}]*routePrefix:"([^"]+)"/g)].map(m => ({
  chave: m[1],
  nome: m[2],
  rota: m[3]
}));

const menus = leia("lib/casca/menus.ts");

/** Páginas atribuídas ao módulo de prefixo de rota mais longo. */
const urls = [];
(function paginas(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!/node_modules|\.next/.test(p)) paginas(p);
    } else if (e.name === "page.tsx") {
      urls.push(
        "/" +
          path
            .relative(path.join(raiz, "app"), p)
            .replace(/\/page\.tsx$/, "")
            .split(path.sep)
            .filter(s => !/^\(.*\)$/.test(s))
            .join("/")
      );
    }
  }
})(path.join(raiz, "app"));

/**
 * Tabelas declaradas como do módulo.
 *
 * Não há como deduzir isto: `project_teams` pertence a `equipes` ou a `obras`?
 * A resposta é decisão de desenho, não de heurística — e heurística errada aqui
 * produziria um checklist que aprova o módulo errado. Enquanto a declaração não
 * existir, o item sai como pendente de declaração, que é a verdade.
 */
function tabelasDeclaradas(chave) {
  const arquivo = path.join(raiz, "diretrizes", "tabelas-por-modulo.json");
  if (!fs.existsSync(arquivo)) return null;
  return JSON.parse(fs.readFileSync(arquivo, "utf8"))[chave] ?? null;
}

/** Coluna que ninguém escreve e ninguém lê. Foi assim que `hourly_cost` passou um mês morta. */
function colunasMortas(tabelas) {
  if (!tabelas) return null;
  const mortas = [];
  for (const tabela of tabelas) {
    const corpo = new RegExp(`create table (?:if not exists )?public\\.${tabela}\\s*\\(([\\s\\S]*?)\\n\\);`, "i").exec(sql);
    if (!corpo) continue;
    for (const linha of corpo[1].split("\n")) {
      const col = /^\s*([a-z_][a-z0-9_]*)\s+(?!.*\b(references|primary|unique|check|constraint)\b)/i.exec(linha);
      if (!col) continue;
      const nome = col[1].toLowerCase();
      if (["id", "organization_id", "created_at", "updated_at", "created_by"].includes(nome)) continue;
      if (!codigoInteiro.includes(nome)) mortas.push(`${tabela}.${nome}`);
    }
  }
  return mortas;
}

/** Número exibido na tela que não entra em conta nenhuma — o defeito do `hourly_cost`. */
function colunasSoExibidas(tabelas) {
  if (!tabelas) return null;
  const soExibidas = [];
  for (const tabela of tabelas) {
    const corpo = new RegExp(`create table (?:if not exists )?public\\.${tabela}\\s*\\(([\\s\\S]*?)\\n\\);`, "i").exec(sql);
    if (!corpo) continue;
    for (const linha of corpo[1].split("\n")) {
      const col = /^\s*([a-z_][a-z0-9_]*)\s+(numeric|integer|bigint|decimal|real|double)/i.exec(linha);
      if (!col) continue;
      const nome = col[1].toLowerCase();
      if (!codigoInteiro.includes(nome)) continue;
      // Aparece em alguma expressão aritmética ou agregação no código ou no SQL?
      const emConta = new RegExp(`${nome}\\s*[*+/-]|[*+/-]\\s*${nome}|sum\\(\\s*[a-z_.]*${nome}|avg\\(\\s*[a-z_.]*${nome}`, "i");
      if (!emConta.test(codigoInteiro) && !emConta.test(sql)) soExibidas.push(`${tabela}.${nome}`);
    }
  }
  return soExibidas;
}

function analisar(m) {
  const semeado = new RegExp(`'${m.chave}'`).test(sql) && /insert into public\.app_modules/i.test(sql);
  const bloco = new RegExp(`\\b${m.chave}\\s*:\\s*\\[([\\s\\S]*?)\\n\\s{0,4}\\]`, "m").exec(menus);
  const destinos = bloco ? [...bloco[1].matchAll(/href:\s*"([^"]+)"/g)].map(x => x[1]) : [];
  const proprios = destinos.filter(h => h === m.rota || h.startsWith(m.rota + "/")).length;
  const paginas = urls.filter(u => {
    const cands = modulos.filter(x => u === x.rota || u.startsWith(x.rota + "/"));
    if (!cands.length) return false;
    return cands.sort((a, b) => b.rota.length - a.rota.length)[0].chave === m.chave;
  }).length;
  const rotaExiste = fs.existsSync(path.join(raiz, "app", m.rota.replace(/^\//, ""))) ||
    fs.existsSync(path.join(raiz, "app", "(app)", m.rota.replace(/^\//, "")));
  const tabelas = tabelasDeclaradas(m.chave);
  return {
    ...m,
    semeado,
    paginas,
    destinos: destinos.length,
    proprios,
    rotaExiste,
    tabelas,
    mortas: colunasMortas(tabelas),
    soExibidas: colunasSoExibidas(tabelas)
  };
}

const alvo = process.argv[2];
const lista = alvo ? modulos.filter(m => m.chave === alvo) : modulos;
if (alvo && lista.length === 0) {
  console.error(`Módulo desconhecido: ${alvo}. Chaves em lib/modules/registry.ts.`);
  process.exit(1);
}

const marca = v => (v === null ? "?" : v ? "sim" : "NÃO");

for (const m of lista.map(analisar)) {
  console.log(`\n=== ${m.chave} — ${m.nome} ===`);
  console.log(`  [1] semeado em app_modules ........ ${marca(m.semeado)}`);
  console.log(`  [2] pasta de rota existe .......... ${marca(m.rotaExiste)}`);
  console.log(`  [3] páginas ....................... ${m.paginas}`);
  console.log(`  [4] menu próprio / total .......... ${m.proprios}/${m.destinos}` +
    (m.destinos && m.proprios / m.destinos < 0.5 ? "  << anel de vizinhos" : ""));
  if (m.tabelas === null) {
    console.log("  [5] tabelas do módulo ............. NÃO DECLARADAS (diretrizes/tabelas-por-modulo.json)");
    console.log("  [6] colunas mortas ................ não apurável sem [5]");
    console.log("  [7] números só exibidos ........... não apurável sem [5]");
  } else {
    console.log(`  [5] tabelas do módulo ............. ${m.tabelas.length}`);
    console.log(`  [6] colunas mortas ................ ${m.mortas.length ? m.mortas.join(", ") : "nenhuma"}`);
    console.log(`  [7] números só exibidos ........... ${m.soExibidas.length ? m.soExibidas.join(", ") : "nenhum"}`);
  }
  console.log("  [8..] os demais itens do checklist exigem verificação humana —");
  console.log("        persona, QA visual, KPI e relatório de ausência.");
  console.log("        Ver diretrizes/CHECKLIST-DE-CONCLUSAO-DE-MODULO.md");
}

console.log(
  `\n${lista.length} módulo(s) conferido(s). Este relatório NÃO aprova módulo: ` +
    `ele responde os itens mecânicos e deixa explícito o que ninguém mediu.`
);
