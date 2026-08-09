// Auditoria estática das superfícies Supabase.
//
// Objetivo: encontrar objetos declarados nas migrations que não possuem um
// consumidor explícito no código TypeScript/JavaScript. O resultado é uma fila
// de investigação, nunca uma autorização automática para DROP: tabelas podem
// ser consumidas por views/functions/triggers e funções podem ser chamadas por
// SQL interno, cron ou integrações externas.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const json = process.argv.includes("--json");
const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function listar(dir, filtro = () => true, saida = []) {
  if (!fs.existsSync(dir)) return saida;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".") || ent.name === "node_modules") continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) listar(abs, filtro, saida);
    else if (filtro(abs)) saida.push(abs);
  }
  return saida;
}

function ler(arq) {
  try { return fs.readFileSync(arq, "utf8"); } catch { return ""; }
}

function rel(arq) {
  return path.relative(raiz, arq).split(path.sep).join("/");
}

function adicionar(mapa, chave, arquivo) {
  if (!chave) return;
  if (!mapa.has(chave)) mapa.set(chave, new Set());
  mapa.get(chave).add(rel(arquivo));
}

const fontesRuntime = ["app", "components", "lib"]
  .flatMap(dir => listar(path.join(raiz, dir), arq => EXT.has(path.extname(arq))));
const fontesOperacionais = listar(path.join(raiz, "scripts"), arq => EXT.has(path.extname(arq)));
const migrations = listar(path.join(raiz, "supabase", "migrations"), arq => arq.endsWith(".sql"));

const runtime = { tables: new Map(), rpcs: new Map(), buckets: new Map(), channels: new Map() };
const operational = { tables: new Map(), rpcs: new Map(), buckets: new Map(), channels: new Map() };

function extrairConsumidores(arquivo, destino) {
  const texto = ler(arquivo);
  for (const m of texto.matchAll(/\.from\(\s*["'`]([a-zA-Z0-9_]+)["'`]\s*\)/g)) adicionar(destino.tables, m[1], arquivo);
  for (const m of texto.matchAll(/\.rpc\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g)) adicionar(destino.rpcs, m[1], arquivo);
  for (const m of texto.matchAll(/\.storage\s*\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) adicionar(destino.buckets, m[1], arquivo);
  // Também cobre createSupabaseBrowserClient().storage.from(...), onde o trecho
  // antes de `.storage` não importa.
  for (const m of texto.matchAll(/storage\s*\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) adicionar(destino.buckets, m[1], arquivo);
  for (const m of texto.matchAll(/\.channel\(\s*["'`]([^"'`]+)["'`]/g)) adicionar(destino.channels, m[1], arquivo);
}

for (const arq of fontesRuntime) extrairConsumidores(arq, runtime);
for (const arq of fontesOperacionais) extrairConsumidores(arq, operational);

const declarados = {
  tables: new Map(), views: new Map(), functions: new Map(), buckets: new Map()
};

function nomeSql(valor) {
  return valor.replace(/^public\./i, "").replace(/^\"|\"$/g, "");
}

// DDL escrito dentro de string (por exemplo EXECUTE format('create table ...'))
// não declara uma relação estática com aquele nome: pode ser template, partição
// dinâmica ou SQL condicional. Comentários e corpos dollar-quoted também não
// devem alimentar o extrator de DDL. Mantemos quebras de linha para facilitar
// depuração sem precisar de um parser PostgreSQL completo.
function mascararNaoDdl(sql) {
  let saida = "";
  let i = 0;

  const mascararTrecho = (trecho) => trecho.replace(/[^\n]/g, " ");

  while (i < sql.length) {
    if (sql.startsWith("--", i)) {
      const fim = sql.indexOf("\n", i + 2);
      const limite = fim === -1 ? sql.length : fim;
      saida += mascararTrecho(sql.slice(i, limite));
      i = limite;
      continue;
    }

    if (sql.startsWith("/*", i)) {
      const fim = sql.indexOf("*/", i + 2);
      const limite = fim === -1 ? sql.length : fim + 2;
      saida += mascararTrecho(sql.slice(i, limite));
      i = limite;
      continue;
    }

    if (sql[i] === "'") {
      const inicio = i;
      i += 1;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i += 1;
          break;
        }
        i += 1;
      }
      saida += mascararTrecho(sql.slice(inicio, i));
      continue;
    }

    if (sql[i] === "$") {
      const tag = sql.slice(i).match(/^\$(?:[a-zA-Z_][a-zA-Z0-9_]*)?\$/)?.[0];
      if (tag) {
        const fim = sql.indexOf(tag, i + tag.length);
        if (fim !== -1) {
          const limite = fim + tag.length;
          saida += mascararTrecho(sql.slice(i, limite));
          i = limite;
          continue;
        }
      }
    }

    saida += sql[i];
    i += 1;
  }

  return saida;
}

for (const migration of migrations) {
  const sql = ler(migration);
  const sqlDdl = mascararNaoDdl(sql);
  for (const m of sqlDdl.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?[\"]?([a-zA-Z0-9_]+)[\"]?/gi)) {
    adicionar(declarados.tables, nomeSql(m[1]), migration);
  }
  for (const m of sqlDdl.matchAll(/create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:public\.)?[\"]?([a-zA-Z0-9_]+)[\"]?/gi)) {
    adicionar(declarados.views, nomeSql(m[1]), migration);
  }
  for (const m of sqlDdl.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?[\"]?([a-zA-Z0-9_]+)[\"]?\s*\(/gi)) {
    adicionar(declarados.functions, nomeSql(m[1]), migration);
  }

  // Buckets são registros, não DDL. Cobre os formatos usuais de seed do repo:
  // insert into storage.buckets (id, name, ...) values ('bucket', ...)
  if (/insert\s+into\s+storage\.buckets/i.test(sql)) {
    for (const m of sql.matchAll(/values\s*\(\s*["']([^"']+)["']/gi)) adicionar(declarados.buckets, m[1], migration);
    for (const m of sql.matchAll(/select\s+["']([^"']+)["']\s*,\s*["']\1["']/gi)) adicionar(declarados.buckets, m[1], migration);
  }
}

function serializar(mapa) {
  return Object.fromEntries([...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([chave, arquivos]) => [chave, [...arquivos].sort()]));
}

function semConsumidor(declarado, mapaRuntime, mapaOperational) {
  return [...declarado.keys()]
    .filter(nome => !mapaRuntime.has(nome) && !mapaOperational.has(nome))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

const tabelaOuView = new Map([...declarados.tables, ...declarados.views]);
const relatorio = {
  schemaVersion: 1,
  warning: "Sem consumidor JS/TS nao significa objeto morto: verificar FKs, views, triggers, policies e chamadas SQL antes de remover.",
  counts: {
    runtimeFiles: fontesRuntime.length,
    operationalFiles: fontesOperacionais.length,
    migrations: migrations.length,
    declaredTables: declarados.tables.size,
    declaredViews: declarados.views.size,
    declaredFunctions: declarados.functions.size,
    declaredBuckets: declarados.buckets.size,
    runtimeTables: runtime.tables.size,
    runtimeRpcs: runtime.rpcs.size,
    runtimeBuckets: runtime.buckets.size
  },
  consumers: {
    runtime: {
      tables: serializar(runtime.tables),
      rpcs: serializar(runtime.rpcs),
      buckets: serializar(runtime.buckets),
      channels: serializar(runtime.channels)
    },
    operational: {
      tables: serializar(operational.tables),
      rpcs: serializar(operational.rpcs),
      buckets: serializar(operational.buckets),
      channels: serializar(operational.channels)
    }
  },
  candidatesWithoutJsConsumer: {
    tablesOrViews: semConsumidor(tabelaOuView, runtime.tables, operational.tables),
    functions: semConsumidor(declarados.functions, runtime.rpcs, operational.rpcs),
    buckets: semConsumidor(declarados.buckets, runtime.buckets, operational.buckets)
  }
};

if (json) {
  process.stdout.write(JSON.stringify(relatorio, null, 2) + "\n");
} else {
  console.log("Auditoria estática de superfícies Supabase");
  console.log(`- ${relatorio.counts.declaredTables} tabelas + ${relatorio.counts.declaredViews} views declaradas`);
  console.log(`- ${relatorio.counts.declaredFunctions} funções declaradas`);
  console.log(`- ${relatorio.counts.declaredBuckets} buckets detectados nas migrations`);
  console.log(`- ${relatorio.counts.runtimeTables} tabelas/views chamadas pelo runtime web`);
  console.log(`- ${relatorio.counts.runtimeRpcs} RPCs chamadas pelo runtime web`);
  console.log(`- ${relatorio.counts.runtimeBuckets} buckets chamados pelo runtime web`);

  for (const [titulo, itens] of Object.entries(relatorio.candidatesWithoutJsConsumer)) {
    console.log(`\n[${titulo}] ${itens.length}`);
    for (const item of itens) console.log(`- ${item}`);
  }
  console.log("\nATENÇÃO: candidato sem consumidor JS/TS não deve ser removido sem cruzamento com dependências internas do Postgres.");
}
