// Export que ninguém importa é código que ninguém executa.
//
// Esta é a peça que faltava no cinto do repositório, e ela nasceu de um número:
// a `main` chegou a ficar com **31 erros de tipo, 23 deles `Cannot find name`**
// — imports e definições apagados por resolução de merge, com os pontos de
// chamada mantidos. O `tsc` pegou aquele lado. O lado oposto — a definição que
// **sobra**, viva no arquivo e morta no sistema — nenhum portão pegava.
//
// É o `U1000` do `staticcheck` do Go, sem trocar de linguagem: lá, função não
// exportada e não usada é reprovada por ferramenta; aqui, o equivalente é
// procurar quem importa cada símbolo exportado.
//
// ## O que ele NÃO faz, de propósito
//
// Não é analisador de tipos. Ele lê `export` e lê `import`, e compara nomes.
// Isso produz duas classes de imprecisão, e as duas foram resolvidas por
// exclusão explícita em vez de heurística silenciosa:
//
//   * **fronteiras do framework** — `page.tsx`, `layout.tsx`, `route.ts` e
//     `middleware` exportam para o Next.js, que importa por convenção de
//     arquivo e não por `import`. Nunca teriam quem os importasse;
//   * **superfície declarada** — um módulo pode exportar de propósito algo que
//     ainda não tem consumidor. Para isso existe `EXPORTS-MORTOS-ACEITOS.json`,
//     que é lista curta, revisada e datada. Exceção que entra ali é decisão
//     registrada; exceção que entra por regex é permissão silenciosa.
//
// Reexportação conta como uso: `export { x } from "./y"` importa de `./y`.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
/** Onde procuramos exports que podem estar mortos. */
const PASTAS_EXPORTADORAS = ["app", "lib", "components"];

/** Onde procuramos quem consome. Inclui `tests` e `scripts`: um símbolo usado
 *  só por teste continua sendo um símbolo usado — e ignorá-los produziu 258
 *  falsos positivos na primeira execução deste validador. */
const PASTAS_CONSUMIDORAS = ["app", "lib", "components", "tests", "scripts"];
const ACEITOS = path.join(raiz, "diretrizes", "EXPORTS-MORTOS-ACEITOS.json");

/** Arquivos que o Next.js importa por convenção, não por `import`. */
const FRONTEIRAS_DO_FRAMEWORK = /(^|\/)(page|layout|template|loading|error|not-found|global-error|route|default|sitemap|robots|icon|opengraph-image|middleware|instrumentation)\.tsx?$/;

/** Nomes que o framework consome por convenção mesmo fora daqueles arquivos. */
const NOMES_DO_FRAMEWORK = new Set([
  "default", "metadata", "generateMetadata", "generateStaticParams",
  "dynamic", "revalidate", "runtime", "fetchCache", "preferredRegion",
  "dynamicParams", "maxDuration", "viewport", "generateViewport", "config",
  "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"
]);

function arquivos(dir) {
  const saida = [];
  if (!fs.existsSync(dir)) return saida;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === "node_modules" || entrada.name.startsWith(".")) continue;
      saida.push(...arquivos(completo));
    } else if (/\.(tsx?|mjs)$/.test(entrada.name)) {
      saida.push(completo);
    }
  }
  return saida;
}

/** Os símbolos exportados por nome. `export default` fica de fora: é fronteira. */
function exportados(fonte) {
  const nomes = new Set();
  const declaracao = /^export\s+(?:async\s+)?(?:function|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm;
  for (const achado of fonte.matchAll(declaracao)) nomes.add(achado[1]);

  // `export { a, b as c }` — o nome que vale é o exposto.
  const lista = /^export\s*\{([^}]*)\}/gm;
  for (const achado of fonte.matchAll(lista)) {
    for (const parte of achado[1].split(",")) {
      const limpo = parte.trim().replace(/^type\s+/, "");
      if (!limpo) continue;
      const apelido = limpo.split(/\s+as\s+/);
      const nome = (apelido[1] ?? apelido[0]).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(nome)) nomes.add(nome);
    }
  }
  return nomes;
}

/** Todo identificador que aparece em qualquer `import`/reexport do repositório. */
function importadosDoRepositorio(todos) {
  const usados = new Set();
  for (const arquivo of todos) {
    const fonte = fs.readFileSync(arquivo, "utf8");
    const chaves = /import\s*(?:type\s*)?\{([^}]*)\}\s*from|export\s*(?:type\s*)?\{([^}]*)\}\s*from/g;
    for (const achado of fonte.matchAll(chaves)) {
      const corpo = achado[1] ?? achado[2] ?? "";
      for (const parte of corpo.split(",")) {
        const limpo = parte.trim().replace(/^type\s+/, "");
        if (!limpo) continue;
        const origem = limpo.split(/\s+as\s+/)[0].trim();
        if (/^[A-Za-z_$][\w$]*$/.test(origem)) usados.add(origem);
      }
    }
    // `import * as X` consome tudo do módulo alvo; sem resolver o alvo, a
    // opção conservadora é não acusar nada daquele arquivo.
    for (const achado of fonte.matchAll(/import\s*\*\s*as\s+[\w$]+\s*from\s*["']([^"']+)["']/g)) {
      usados.add(`__NAMESPACE__${achado[1]}`);
    }
  }
  return usados;
}

const todos = PASTAS_EXPORTADORAS.flatMap(pasta => arquivos(path.join(raiz, pasta)));
const consumidores = PASTAS_CONSUMIDORAS.flatMap(pasta => arquivos(path.join(raiz, pasta)));
const usados = importadosDoRepositorio(consumidores);

const aceitos = fs.existsSync(ACEITOS)
  ? new Set((JSON.parse(fs.readFileSync(ACEITOS, "utf8")).aceitos ?? []).map(item => item.simbolo))
  : new Set();

const mortos = [];
for (const arquivo of todos) {
  const relativo = path.relative(raiz, arquivo);
  if (FRONTEIRAS_DO_FRAMEWORK.test(relativo)) continue;
  const fonte = fs.readFileSync(arquivo, "utf8");
  for (const nome of exportados(fonte)) {
    if (NOMES_DO_FRAMEWORK.has(nome)) continue;
    if (usados.has(nome)) continue;
    if (aceitos.has(`${relativo}:${nome}`) || aceitos.has(nome)) continue;
    mortos.push(`${relativo}:${nome}`);
  }
}

if (mortos.length) {
  console.error(`Exports sem nenhum importador (${mortos.length}):`);
  for (const item of mortos.sort()) console.error(`  - ${item}`);
  console.error(
    "\nOu o símbolo perdeu o consumidor — e aí é código morto, que foi o defeito " +
    "que motivou este validador —, ou ele é superfície declarada de propósito. " +
    `No segundo caso, registre em diretrizes/EXPORTS-MORTOS-ACEITOS.json com motivo e data.`
  );
  process.exit(1);
}

console.log(
  `Exports conferidos: ${todos.length} arquivo(s) varrido(s), ` +
  `${aceitos.size} exceção(ões) registrada(s), nenhum export sem importador.`
);
