// Prevenção executável da VACINA-052-EMBED-AMBIGUO-DEVOLVE-PGRST201-E-DERRUBA-A-CONSULTA-INTEIRA.md.
//
// Quando existem **dois caminhos** entre duas tabelas — `projects.contract_id`
// aponta para `contracts`, e `contracts.project_id` aponta de volta para
// `projects` — o PostgREST se recusa a adivinhar qual deles o `select` quis, e
// devolve PGRST201. A consulta inteira falha; não é o embed que vem vazio, é a
// linha que não vem.
//
// O que torna isso caro é o silêncio: `pnpm typecheck` não vê, o teste
// unitário não vê, e a tela não quebra — ela mostra "nenhuma obra cadastrada"
// com duas obras no banco, ou 404 numa obra que existe. Foi assim que a lista
// de obras ficou vazia por semanas sem ninguém reportar defeito.
//
// Este validador reconstrói o grafo de chaves estrangeiras a partir das
// migrations, descobre quais pares de tabelas têm mais de um caminho, e reprova
// qualquer `select` que faça embed nesse par **sem nomear a chave** com
// `tabela!nome_da_constraint(...)`.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const MIGRATIONS = path.join(raiz, "supabase", "migrations");
const PASTAS = ["app", "lib", "components"];

/* ------------------------------------------------------------------ */
/* 1. Grafo de chaves estrangeiras, lido das migrations                 */
/* ------------------------------------------------------------------ */

/**
 * Arestas `origem -> destino`, uma por chave estrangeira.
 *
 * Duas formas aparecem no repositório e as duas contam:
 * inline, dentro do `create table` (`col uuid references public.x(id)`), e
 * avulsa, no `alter table ... add constraint ... references public.x`.
 */
function arquivosSql() {
  if (!fs.existsSync(MIGRATIONS)) return [];
  return fs
    .readdirSync(MIGRATIONS)
    .filter(n => n.endsWith(".sql"))
    .sort()
    .map(nome => ({ nome, texto: fs.readFileSync(path.join(MIGRATIONS, nome), "utf8") }));
}

function arestasDasMigrations() {
  const arestas = [];
  for (const { nome, texto: sql } of arquivosSql()) {
    // Comentário de fim de linha carrega `references` em prosa; sem tirar,
    // a explicação de uma vacina viraria aresta do grafo.
    const limpo = sql.replace(/--[^\n]*/g, "");

    for (const bloco of blocosDeCriacao(limpo)) {
      for (const destino of referencias(bloco.corpo)) {
        arestas.push({ origem: bloco.tabela, destino, arquivo: nome });
      }
    }
    for (const trecho of limpo.split(/;/)) {
      const alter = /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?public\.([a-z0-9_]+)/i.exec(trecho);
      if (!alter) continue;
      // Sem exigir a palavra `foreign key`. Foi esse o ponto cego da primeira
      // versão deste validador: `projects.contract_id` nasceu de um
      // `add column ... references public.contracts`, referência inline sem a
      // palavra-chave — e a aresta que originou o defeito ficou de fora do
      // grafo, deixando o validador aprovar exatamente o caso que motivou ele.
      for (const destino of referencias(trecho)) {
        arestas.push({ origem: alter[1], destino, arquivo: nome });
      }
    }
  }
  return arestas;
}

/** Corpo de cada `create table public.x ( ... );`, sem depender de indentação. */
function blocosDeCriacao(sql) {
  const blocos = [];
  const inicio = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)\s*\(/gi;
  let m;
  while ((m = inicio.exec(sql))) {
    let profundidade = 1;
    let i = inicio.lastIndex;
    while (i < sql.length && profundidade > 0) {
      if (sql[i] === "(") profundidade += 1;
      else if (sql[i] === ")") profundidade -= 1;
      i += 1;
    }
    blocos.push({ tabela: m[1], corpo: sql.slice(inicio.lastIndex, i - 1) });
  }
  return blocos;
}

function referencias(trecho) {
  return [...trecho.matchAll(/references\s+public\.([a-z0-9_]+)/gi)].map(r => r[1]);
}

/**
 * Pares com mais de um caminho.
 *
 * A direção não importa para o PostgREST: `projects -> contracts` e
 * `contracts -> projects` já são dois caminhos entre o mesmo par, e é
 * exatamente esse o caso que derrubou a lista de obras.
 */
function paresAmbiguos(arestas) {
  const contagem = new Map();
  for (const { origem, destino } of arestas) {
    if (origem === destino) continue;
    const chave = [origem, destino].sort().join(" ");
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return new Set([...contagem.entries()].filter(([, n]) => n > 1).map(([chave]) => chave));
}

/* ------------------------------------------------------------------ */
/* 2. Embeds escritos no código                                         */
/* ------------------------------------------------------------------ */

function arquivosDeCodigo(dir) {
  const saida = [];
  if (!fs.existsSync(dir)) return saida;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name === "node_modules" || item.name.startsWith(".")) continue;
    const caminho = path.join(dir, item.name);
    if (item.isDirectory()) saida.push(...arquivosDeCodigo(caminho));
    else if (/\.(ts|tsx)$/.test(item.name)) saida.push(caminho);
  }
  return saida;
}

/**
 * Cada embed de um `select`, com o **pai certo**.
 *
 * O `select` do PostgREST é uma árvore: em
 * `from("a").select("b(c(d))")`, `c` é embed de `b`, não de `a`. A primeira
 * versão deste leitor achatava a string e atribuía tudo à tabela do `from` —
 * e acusou 22 embeds perfeitamente válidos como relação inexistente. Foi por
 * pouco que a lista não virou 22 correções desnecessárias em oito módulos.
 *
 * A leitura passa a acompanhar a profundidade, com uma pilha de pais.
 */
function embedsDoSelect(base, select, linha) {
  const achados = [];
  const pilha = [base];
  for (let i = 0; i < select.length; i += 1) {
    if (select[i] === ")") {
      if (pilha.length > 1) pilha.pop();
      continue;
    }
    if (select[i] !== "(") continue;
    // O que vem imediatamente antes do parêntese é o nome da relação, com o
    // modificador opcional depois de `!`.
    const antes = /([a-z0-9_]+)(?:!([a-z0-9_]+))?\s*$/i.exec(select.slice(0, i));
    if (!antes) { pilha.push(pilha[pilha.length - 1]); continue; }
    const modificador = antes[2];
    achados.push({
      base: pilha[pilha.length - 1],
      relacionada: antes[1],
      // `!inner` e `!left` são dicas de junção, não nome de constraint: um
      // embed ambíguo escrito `tabela!inner(...)` continua ambíguo.
      nomeada: Boolean(modificador) && !["inner", "left"].includes(modificador.toLowerCase()),
      linha
    });
    pilha.push(antes[1]);
  }
  return achados;
}

/**
 * Cada `.from("x")` seguido de `.select("...")` **no mesmo encadeamento**.
 *
 * A versão anterior abria uma janela fixa de 2.000 caracteres. Se o primeiro
 * encadeamento fosse `.from("a").insert(...)` sem `.select`, a janela podia
 * atravessar o próximo `.from("b").select(...)` e atribuir o select de `b` a
 * `a`, inventando um PGRST200. Agora cada busca termina no próximo `.from()`.
 */
function embedsDoArquivo(texto) {
  const achados = [];
  const padraoFrom = /\.from\(\s*["'`]([a-z0-9_]+)["'`]\s*\)/gi;
  const froms = [...texto.matchAll(padraoFrom)];

  for (let indice = 0; indice < froms.length; indice += 1) {
    const atual = froms[indice];
    const inicio = atual.index ?? 0;
    const proximoInicio = froms[indice + 1]?.index ?? texto.length;
    const fim = Math.min(inicio + 2000, proximoInicio);
    const janela = texto.slice(inicio, fim);
    const select = /\.select\(\s*(["'`])([\s\S]*?)\1/.exec(janela);
    if (!select) continue;
    const linha = texto.slice(0, inicio).split("\n").length;
    achados.push(...embedsDoSelect(atual[1], select[2], linha));
  }
  return achados;
}

/* ------------------------------------------------------------------ */
/* 3. Confronto                                                         */
/* ------------------------------------------------------------------ */

const arestas = arestasDasMigrations();
const ambiguos = paresAmbiguos(arestas);
/** Pares com pelo menos um caminho — os que o PostgREST consegue resolver. */
const existe = new Set(
  arestas.filter(a => a.origem !== a.destino).map(a => [a.origem, a.destino].sort().join(" "))
);
/**
 * O universo de tabelas conhecidas vem dos `create table`, não das arestas.
 *
 * Derivá-lo das chaves estrangeiras deixa de fora toda tabela que não é destino
 * de nenhuma — `public.profiles` é uma delas — e o filtro de "nome conhecido"
 * descartava justamente o embed que motivou o ramo de PGRST200. O validador
 * aprovava por não enxergar, que é a forma mais cara de aprovar.
 */
const tabelas = new Set([
  ...arestas.flatMap(a => [a.origem, a.destino]),
  ...arquivosSql().flatMap(({ texto }) =>
    [...texto.replace(/--[^\n]*/g, "").matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi)].map(m => m[1])
  )
]);

const problemas = [];
let selectsLidos = 0;

for (const pasta of PASTAS) {
  for (const arquivo of arquivosDeCodigo(path.join(raiz, pasta))) {
    const texto = fs.readFileSync(arquivo, "utf8");
    for (const { base, relacionada, nomeada, linha } of embedsDoArquivo(texto)) {
      // `count(...)`, `sum(...)` e afins não são tabela; o filtro é ter nome
      // conhecido no grafo.
      if (!tabelas.has(relacionada) || !tabelas.has(base)) continue;
      selectsLidos += 1;
      const chave = [base, relacionada].sort().join(" ");

      // Sem caminho nenhum: PGRST200. É a outra metade da mesma família e custa
      // igual — `project_memberships` embutia `profiles(full_name)` com a
      // coluna apontando para `auth.users`, e a lista de membros inteira
      // falhava. O seletor de responsável mostrava o começo de um uuid no lugar
      // do nome da pessoa, nas telas de tarefas e de equipes.
      if (!existe.has(chave)) {
        problemas.push(
          `${path.relative(raiz, arquivo)}:${linha} — embed \`${relacionada}(...)\` a partir de ` +
            `\`${base}\`: não há chave estrangeira entre as duas tabelas. O PostgREST devolve ` +
            `PGRST200 e a consulta inteira falha — leia em duas consultas.`
        );
        continue;
      }

      if (nomeada) continue;
      if (!ambiguos.has(chave)) continue;
      problemas.push(
        `${path.relative(raiz, arquivo)}:${linha} — embed \`${relacionada}(...)\` a partir de ` +
          `\`${base}\` é ambíguo: há mais de um caminho entre as duas tabelas. ` +
          `Nomeie a chave (\`${relacionada}!nome_da_constraint(...)\`), senão o PostgREST devolve PGRST201 ` +
          `e a consulta inteira falha.`
      );
    }
  }
}

if (problemas.length) {
  console.error("Embeds ambíguos no PostgREST:\n");
  for (const problema of problemas) console.error(`  - ${problema}`);
  console.error(
    `\n${problemas.length} embed(s) reprovado(s). Pares com mais de um caminho: ${ambiguos.size}.`
  );
  process.exit(1);
}

console.log(
  `Embeds do PostgREST conferidos: ${selectsLidos} embed(s) em ${arestas.length} chave(s) estrangeira(s), ` +
    `${ambiguos.size} par(es) ambíguo(s), nenhum sem chave nomeada.`
);
