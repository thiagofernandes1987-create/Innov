// Auditoria de alcançabilidade do runtime web.
//
// Por que existe: o MAPA-DO-CODIGO detecta `lib/` nunca importada e server
// action sem import nomeado, mas não detecta uma ilha como
// `page antiga` + (`componente novo` -> `action nova`) quando componente e action
// continuam se referenciando entre si. Para o compilador os dois arquivos são
// coerentes; para o usuário eles não existem porque nenhuma rota chega neles.
//
// Este script monta o grafo de imports locais e parte apenas dos entrypoints que
// o Next carrega automaticamente. Arquivo não alcançável **não é apagado**:
// vira candidato de auditoria. Workers, scripts e ferramentas offline podem ser
// legítimos fora do runtime web.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const json = process.argv.includes("--json");
const falharComIlhas = process.argv.includes("--fail-on-orphans");

const EXTENSOES = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const DIRETORIOS_RUNTIME = ["app", "components", "lib"];

function listar(dir, saida = []) {
  if (!fs.existsSync(dir)) return saida;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name.startsWith(".") || entrada.name === "node_modules") continue;
    const absoluto = path.join(dir, entrada.name);
    if (entrada.isDirectory()) listar(absoluto, saida);
    else if (EXTENSOES.some(ext => entrada.name.endsWith(ext))) saida.push(absoluto);
  }
  return saida;
}

const relativo = arquivo => path.relative(raiz, arquivo).split(path.sep).join("/");
const todos = DIRETORIOS_RUNTIME.flatMap(dir => listar(path.join(raiz, dir)));
const porRelativo = new Map(todos.map(arquivo => [relativo(arquivo), arquivo]));

function semExtensao(valor) {
  for (const ext of EXTENSOES) {
    if (valor.endsWith(ext)) return valor.slice(0, -ext.length);
  }
  return valor;
}

function resolverArquivo(baseRelativo) {
  const base = semExtensao(baseRelativo).replaceAll("\\", "/");
  const candidatos = [
    ...EXTENSOES.map(ext => `${base}${ext}`),
    ...EXTENSOES.map(ext => `${base}/index${ext}`)
  ];
  return candidatos.find(candidato => porRelativo.has(candidato)) ?? null;
}

function resolverImport(importador, spec) {
  if (spec.startsWith("@/")) return resolverArquivo(spec.slice(2));
  if (!spec.startsWith(".")) return null;
  const pasta = path.posix.dirname(importador);
  return resolverArquivo(path.posix.normalize(path.posix.join(pasta, spec)));
}

function especificadores(texto) {
  const specs = new Set();
  const padroes = [
    /(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["'`]([^"'`]+)["'`]/g,
    /import\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
    /require\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g
  ];
  for (const padrao of padroes) {
    for (const achado of texto.matchAll(padrao)) specs.add(achado[1]);
  }
  return [...specs];
}

const grafo = new Map();
for (const [rel, absoluto] of porRelativo) {
  const texto = fs.readFileSync(absoluto, "utf8");
  const destinos = especificadores(texto)
    .map(spec => resolverImport(rel, spec))
    .filter(Boolean);
  grafo.set(rel, [...new Set(destinos)]);
}

// Entry points reconhecidos automaticamente pelo App Router. `layout` também é
// raiz porque pode importar providers/componentes que uma página não importa.
const PADRAO_ENTRYPOINT = /(^|\/)(page|route|layout|template|loading|error|not-found|default)\.(?:tsx?|jsx?)$/;
const raizes = [...porRelativo.keys()].filter(rel => rel.startsWith("app/") && PADRAO_ENTRYPOINT.test(rel));

// Entry points especiais fora de app/ que o Next pode carregar diretamente.
for (const especial of ["middleware.ts", "middleware.js", "proxy.ts", "proxy.js", "instrumentation.ts", "instrumentation.js"]) {
  if (porRelativo.has(especial)) raizes.push(especial);
}

const alcancados = new Set();
const pilha = [...new Set(raizes)];
while (pilha.length) {
  const atual = pilha.pop();
  if (!atual || alcancados.has(atual)) continue;
  alcancados.add(atual);
  for (const destino of grafo.get(atual) ?? []) {
    if (!alcancados.has(destino)) pilha.push(destino);
  }
}

const candidatos = [...porRelativo.keys()]
  .filter(rel => !alcancados.has(rel))
  .filter(rel => !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(rel))
  .sort((a, b) => a.localeCompare(b, "pt-BR"));

const grupos = {
  actions: candidatos.filter(rel => rel.startsWith("app/actions/")),
  components: candidatos.filter(rel => rel.startsWith("components/")),
  lib: candidatos.filter(rel => rel.startsWith("lib/")),
  appOutros: candidatos.filter(rel => rel.startsWith("app/") && !rel.startsWith("app/actions/"))
};

// Pequeno diagnóstico de ilhas: mostra relações entre candidatos. É útil para
// distinguir um arquivo solto de um subsistema inteiro desconectado da UI.
const candidatoSet = new Set(candidatos);
const ilhas = candidatos
  .map(origem => ({
    origem,
    destinosOrfaos: (grafo.get(origem) ?? []).filter(destino => candidatoSet.has(destino))
  }))
  .filter(item => item.destinosOrfaos.length > 0);

const relatorio = {
  schemaVersion: 1,
  roots: raizes.length,
  runtimeFiles: porRelativo.size,
  reachableFiles: alcancados.size,
  unreachableCandidates: candidatos.length,
  groups: grupos,
  orphanEdges: ilhas
};

if (json) {
  process.stdout.write(JSON.stringify(relatorio, null, 2) + "\n");
} else {
  console.log("Auditoria de alcançabilidade do runtime web");
  console.log(`- entrypoints: ${relatorio.roots}`);
  console.log(`- arquivos runtime: ${relatorio.runtimeFiles}`);
  console.log(`- alcançáveis: ${relatorio.reachableFiles}`);
  console.log(`- candidatos não alcançáveis: ${relatorio.unreachableCandidates}`);

  for (const [grupo, arquivos] of Object.entries(grupos)) {
    console.log(`\n[${grupo}] ${arquivos.length}`);
    for (const arquivo of arquivos) console.log(`- ${arquivo}`);
  }

  if (ilhas.length) {
    console.log("\n[arestas entre candidatos — possíveis ilhas]");
    for (const ilha of ilhas) {
      console.log(`- ${ilha.origem} -> ${ilha.destinosOrfaos.join(", ")}`);
    }
  }

  console.log("\nObservação: não alcançável pelo app web é candidato de auditoria, não autorização para excluir.");
}

if (falharComIlhas && candidatos.length) process.exitCode = 1;
