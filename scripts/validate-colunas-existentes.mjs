// Consulta segue o contrato real da tabela — VACINA-036.
//
// ## Por que existe
//
// A importação de um recebimento para o estoque falhava porque ordenava as
// linhas por `procurement_receipt_items.created_at`, coluna que nunca existiu.
// A consulta foi construída por expectativa de convenção — *toda tabela tem
// `created_at`* — e não a partir do schema. O PostgreSQL só reclamou quando o
// cenário integrado P9 → P10 → P4 finalmente atravessou aquele trecho.
//
// A prevenção que a vacina declarou é um teste de ponta a ponta: recebimento
// aceito → importação idempotente → movimento `POSTED` → saldo no dashboard. Ela
// pega o caminho que o teste percorre, e só ele. Coluna inventada em qualquer
// outra consulta continua passando por lint, `tsc`, todos os validadores e a
// suíte inteira — medido por sabotagem em 11/08/2026: acrescentar
// `coluna_que_nao_existe` a um `.select()` de `daily_logs` não reprovou **nada**.
//
// Este portão fecha isso sem banco: reconstrói as colunas de cada tabela a
// partir das migrations e confere o que o código pede.
//
// ## O que confere
//
//   .select("a,b,c")   cada nome de coluna de primeiro nível
//   .eq/.neq/.gt/.gte/.lt/.lte/.like/.ilike/.is/.in/.contains  a coluna filtrada
//   .order("coluna")   a coluna ordenada — que é a forma exata do defeito
//
// ## O que deliberadamente não confere, e por quê
//
//   - **Relação que não nasce de `create table`** — view, view materializada e
//     resultado de RPC. O portão não sabe as colunas delas, e chutar viraria
//     acusação falsa. O total fica impresso na saída, para que a lacuna seja
//     visível em vez de silenciosa.
//   - **String montada** — `.select(`${…}`)` ou variável. O nome só existe em
//     tempo de execução.
//   - **Coluna dentro de embed** — `obra(nome,codigo)` pertence à tabela
//     embutida, e resolver isso é o trabalho do `validate:postgrest-embeds`.
//     Aqui só entram os nomes de primeiro nível.
//
// Declarar a limitação é parte do portão: portão que finge cobrir o que não
// cobre é pior que portão nenhum, porque quem lê para de procurar.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const MIGRATIONS = path.join(raiz, "supabase", "migrations");
const PASTAS = ["app", "lib", "components"];

// ---------------------------------------------------------------------------
// Schema a partir das migrations — estado final, não histórico.
// ---------------------------------------------------------------------------

/** Divide por vírgula respeitando parênteses e literais. */
function partesDeTopo(texto) {
  const partes = [];
  let inicio = 0, profundidade = 0, aspas = null;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) { if (ch === aspas && texto[i - 1] !== "\\") aspas = null; continue; }
    if (ch === "'" || ch === '"') { aspas = ch; continue; }
    if (ch === "(") profundidade++;
    else if (ch === ")") profundidade--;
    else if (ch === "," && profundidade === 0) { partes.push(texto.slice(inicio, i)); inicio = i + 1; }
  }
  partes.push(texto.slice(inicio));
  return partes;
}

const RESTRICOES = /^(constraint|primary\s+key|foreign\s+key|unique|check|exclude|like|inherits)\b/i;

function colunasDoBloco(corpo) {
  const colunas = [];
  for (const bruto of partesDeTopo(corpo)) {
    const item = bruto.trim();
    if (!item || RESTRICOES.test(item)) continue;
    const nome = /^"?([a-z_][a-z0-9_]*)"?\s+/i.exec(item);
    if (nome) colunas.push(nome[1].toLowerCase());
  }
  return colunas;
}

function lerSchema() {
  const tabelas = new Map();   // nome -> Set(coluna)
  const naoTabela = new Set(); // view, view materializada: existem, mas sem colunas conhecidas

  const arquivos = fs.existsSync(MIGRATIONS)
    ? fs.readdirSync(MIGRATIONS).filter(n => n.endsWith(".sql")).sort()
    : [];

  // Duas passagens, e a razão é medida: `20260719223000_stage12_planning_schema`
  // acrescenta `city`, `progress` e outras nove colunas a `public.projects`, que
  // só é criada em `20260719230000_stage9_financial_contracts` — a alteração vem
  // **antes** da criação na ordem dos nomes. Aplicar ALTER só sobre tabela já
  // vista descartaria essas onze colunas e faria o portão acusar consultas
  // corretas. A primeira execução acusou exatamente isso.
  const sqls = arquivos.map(nome => ({
    nome,
    sql: fs.readFileSync(path.join(MIGRATIONS, nome), "utf8").replace(/--[^\n]*/g, "")
  }));

  for (const { sql } of sqls) {
    // create table … ( … )
    const abre = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)\s*\(/gi;
    let m;
    while ((m = abre.exec(sql))) {
      let profundidade = 1, i = abre.lastIndex;
      while (i < sql.length && profundidade > 0) {
        if (sql[i] === "(") profundidade++;
        else if (sql[i] === ")") profundidade--;
        i++;
      }
      const tabela = m[1].toLowerCase();
      if (!tabelas.has(tabela)) tabelas.set(tabela, new Set());
      for (const c of colunasDoBloco(sql.slice(abre.lastIndex, i - 1))) tabelas.get(tabela).add(c);
    }

    // create table … as select  → colunas vêm da consulta; não dá para saber
    for (const t of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)\s+as\s+select/gi)) {
      naoTabela.add(t[1].toLowerCase());
      tabelas.delete(t[1].toLowerCase());
    }

    // views: existem para o PostgREST, mas as colunas saem de um select
    for (const v of sql.matchAll(/create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi)) {
      naoTabela.add(v[1].toLowerCase());
    }

    for (const d of sql.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?public\.([a-z0-9_]+)/gi)) {
      tabelas.delete(d[1].toLowerCase());
    }
  }

  // Segunda passagem: as alterações, agora que toda tabela declarada já existe.
  for (const { sql } of sqls) {
    for (const trecho of sql.split(/;/)) {
      const alter = /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?public\.([a-z0-9_]+)/i.exec(trecho);
      if (!alter) continue;
      const tabela = alter[1].toLowerCase();
      if (!tabelas.has(tabela)) continue;

      for (const add of trecho.matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_]*)"?/gi)) {
        tabelas.get(tabela).add(add[1].toLowerCase());
      }
      for (const drop of trecho.matchAll(/drop\s+column\s+(?:if\s+exists\s+)?"?([a-z_][a-z0-9_]*)"?/gi)) {
        tabelas.get(tabela).delete(drop[1].toLowerCase());
      }
      for (const ren of trecho.matchAll(/rename\s+column\s+"?([a-z_][a-z0-9_]*)"?\s+to\s+"?([a-z_][a-z0-9_]*)"?/gi)) {
        tabelas.get(tabela).delete(ren[1].toLowerCase());
        tabelas.get(tabela).add(ren[2].toLowerCase());
      }
    }
  }

  return { tabelas, naoTabela };
}

// ---------------------------------------------------------------------------
// Consultas no código.
// ---------------------------------------------------------------------------

function arquivosDeCodigo(dir, saida = []) {
  if (!fs.existsSync(dir)) return saida;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name === "node_modules" || item.name.startsWith(".")) continue;
    const caminho = path.join(dir, item.name);
    if (item.isDirectory()) arquivosDeCodigo(caminho, saida);
    else if (/\.(ts|tsx)$/.test(item.name)) saida.push(caminho);
  }
  return saida;
}

/**
 * Índice logo depois do literal que começa em `abre`.
 *
 * Aspas simples, dupla e crase, com escape — e, dentro da crase, a interpolação
 * `${…}` com chaves aninhadas e literais próprios. Contar `${` sem casar o `}`
 * fazia o varredor perder o fim da string e engolir a consulta seguinte: foi
 * assim que `.or(`prazo.lte.${hoje}`)` de `pipeline_card_activities` levou o
 * portão a cobrar dela as colunas de `operational_notifications`.
 */
function fimDoLiteral(texto, abre) {
  const aspas = texto[abre];
  for (let i = abre + 1; i < texto.length; i++) {
    const ch = texto[i];
    if (ch === "\\") { i++; continue; }
    if (ch === aspas) return i + 1;
    if (aspas === "`" && ch === "$" && texto[i + 1] === "{") {
      let chaves = 1;
      i += 2;
      while (i < texto.length && chaves > 0) {
        const dentro = texto[i];
        if (dentro === "'" || dentro === '"' || dentro === "`") { i = fimDoLiteral(texto, i); continue; }
        if (dentro === "{") chaves++;
        else if (dentro === "}") chaves--;
        i++;
      }
      i -= 1;
    }
  }
  return texto.length;
}

/**
 * Fim do encadeamento que começa neste `.from(`.
 *
 * Para em três lugares, o que vier primeiro, e cada um custou uma rodada de
 * acusações falsas:
 *
 *   `;`               fim do statement;
 *   `.from("…")`      a consulta seguinte — sem isto, um `Promise.all([…])`
 *                     vira uma consulta só e cada tabela responde pelos filtros
 *                     das vizinhas;
 *   `)` que fecha     um `.from()` **aninhado dentro de um argumento** —
 *   parêntese externo `.in("employment_id", (await …from("rh_employments")…).data)`
 *                     é um encadeamento que termina ali, e o `.order(…)` depois
 *                     dele pertence à consulta de fora, não a esta.
 *
 * Literais e templates são respeitados: `;`, `(` e `)` dentro de string não
 * contam.
 */
function fimDoEncadeamento(texto, inicio) {
  let profundidade = 0;
  for (let i = inicio; i < texto.length; i++) {
    const ch = texto[i];
    if (ch === "'" || ch === '"' || ch === "`") { i = fimDoLiteral(texto, i) - 1; continue; }
    if (ch === "(") { profundidade++; continue; }
    if (ch === ")") { if (profundidade === 0) return i; profundidade--; continue; }
    if (ch === ";") return i;
    if (profundidade === 0 && texto.startsWith(".from(", i)) return i;
  }
  return texto.length;
}

/**
 * Apaga do encadeamento os argumentos que **contêm outra consulta**.
 *
 * `.in("employment_id", (await …from("rh_employments").select("id").eq("worker_id",id)).data)`
 * é uma consulta dentro do argumento de outra. Sem apagá-la, o `.eq("worker_id")`
 * de dentro é cobrado da tabela de fora — e `rh_employment_conditions` foi
 * acusada de não ter `worker_id`, que ela de fato não tem e nunca precisou ter.
 *
 * Apaga só o grupo que contém `.from(`; argumento comum — inclusive a lista do
 * `.select()` — fica intacto. Substitui por espaços para não deslocar as linhas
 * do relatório.
 */
function semSubconsultas(trecho) {
  const saida = trecho.split("");
  for (let i = 0; i < trecho.length; i++) {
    if (trecho[i] !== "(") continue;
    let profundidade = 1, j = i + 1;
    while (j < trecho.length && profundidade > 0) {
      if (trecho[j] === "(") profundidade++;
      else if (trecho[j] === ")") profundidade--;
      j++;
    }
    const dentro = trecho.slice(i + 1, j - 1);
    if (!dentro.includes(".from(")) continue;
    for (let k = i + 1; k < j - 1; k++) if (saida[k] !== "\n") saida[k] = " ";
    i = j - 1;
  }
  return saida.join("");
}

/**
 * Colunas de primeiro nível de um `.select()`.
 *
 * Descarta o que está dentro de `(...)` — é da tabela embutida — e desmonta as
 * formas que o PostgREST aceita: apelido `nome:coluna`, cast `coluna::tipo`,
 * agregado `coluna.sum()`, `*` e `count`.
 */
function colunasDoSelect(lista) {
  const topo = [];
  let profundidade = 0, atual = "";
  for (const ch of lista) {
    if (ch === "(") { profundidade++; continue; }
    if (ch === ")") { profundidade--; continue; }
    if (profundidade > 0) continue;
    if (ch === ",") { topo.push(atual); atual = ""; continue; }
    atual += ch;
  }
  topo.push(atual);

  const colunas = [];
  for (const bruto of topo) {
    let item = bruto.trim();
    if (!item) continue;
    // O que vem antes de `(` é nome de relação embutida, não coluna.
    if (bruto !== item && /[!:]/.test(item) === false && item === "") continue;
    item = item.replace(/!(?:inner|left)\b/gi, "");
    if (item.includes(":")) item = item.slice(item.indexOf(":") + 1);
    item = item.split("::")[0];
    item = item.replace(/\.(?:sum|avg|count|max|min)\(\)$/i, "");
    item = item.trim().replace(/^"|"$/g, "");
    if (!item || item === "*" || item === "count") continue;
    if (!/^[a-z_][a-z0-9_]*$/i.test(item)) continue;
    colunas.push({ coluna: item.toLowerCase(), trecho: bruto.trim() });
  }
  return colunas;
}

/** Nomes que aparecem antes de `(` são relações embutidas, e saem da conta. */
function relacoesEmbutidas(lista) {
  return new Set(
    [...lista.matchAll(/([a-z0-9_]+)(?:!(?:inner|left|[a-z0-9_]+))?\s*\(/gi)].map(m => m[1].toLowerCase())
  );
}

const FILTROS = /\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|containedBy|overlaps|order)\(\s*"([a-z0-9_]+)"/g;

const { tabelas, naoTabela } = lerSchema();

/**
 * Dívida declarada: coluna que **existe no banco** e nenhuma migration declara.
 *
 * Não é o código que está errado — é o repositório que não sabe recriar o
 * próprio schema. Corrigir apagando a consulta quebraria a tela que funciona;
 * corrigir escrevendo a migration é a S-77. Até lá a divergência fica datada e
 * com a prova ao lado, como já é o padrão de `EXPORTS-MORTOS-ACEITOS.json` e
 * `EXECUTE-PUBLIC-ACEITOS.json`: a lista só pode encolher.
 */
const divida = new Set(
  JSON.parse(fs.readFileSync(path.join(raiz, "diretrizes", "COLUNAS-SEM-MIGRATION.json"), "utf8"))
    .colunas.map(c => `${c.tabela}.${c.coluna}`)
);
const dividaUsada = new Set();

const problemas = [];
let selectsConferidos = 0, colunasConferidas = 0, filtrosConferidos = 0;
let pulados = 0;

function aceita(tabela, coluna) {
  const chave = `${tabela}.${coluna}`;
  if (!divida.has(chave)) return false;
  dividaUsada.add(chave);
  return true;
}

for (const pasta of PASTAS) {
  for (const arquivo of arquivosDeCodigo(path.join(raiz, pasta))) {
    const texto = fs.readFileSync(arquivo, "utf8");
    const relativo = path.relative(raiz, arquivo);

    for (const de of texto.matchAll(/\.from\(\s*"([a-z0-9_]+)"\s*\)/g)) {
      const tabela = de[1].toLowerCase();
      if (!tabelas.has(tabela)) { pulados += 1; continue; }
      const conhecidas = tabelas.get(tabela);
      const statement = semSubconsultas(
        texto.slice(de.index, fimDoEncadeamento(texto, de.index + de[0].length))
      );
      const linhaBase = texto.slice(0, de.index).split("\n").length;

      const select = /\.select\(\s*"([^"]*)"/.exec(statement);
      if (select) {
        selectsConferidos += 1;
        const embutidas = relacoesEmbutidas(select[1]);
        for (const { coluna, trecho } of colunasDoSelect(select[1])) {
          if (embutidas.has(coluna)) continue;
          colunasConferidas += 1;
          if (conhecidas.has(coluna) || aceita(tabela, coluna)) continue;
          problemas.push({
            arquivo: relativo,
            linha: linhaBase + statement.slice(0, select.index).split("\n").length - 1,
            o_que: `\`${tabela}\` não tem a coluna \`${coluna}\` — pedida em .select("… ${trecho} …")`
          });
        }
      }

      for (const filtro of statement.matchAll(FILTROS)) {
        const coluna = filtro[2].toLowerCase();
        // `.in("chave", …)` sobre relação embutida usa caminho com ponto; aqui
        // só entram nomes simples, que são da própria tabela.
        filtrosConferidos += 1;
        if (conhecidas.has(coluna) || aceita(tabela, coluna)) continue;
        problemas.push({
          arquivo: relativo,
          linha: linhaBase + statement.slice(0, filtro.index).split("\n").length - 1,
          o_que: `\`${tabela}\` não tem a coluna \`${coluna}\` — usada em .${filtro[1]}("${filtro[2]}", …)`
        });
      }
    }
  }
}

// Dívida que não é mais usada tem de sair da lista. Sem esta conferência a
// lista só cresce: alguém escreve a migration, o portão para de precisar da
// linha, e ela fica lá dando a impressão de que a divergência continua.
const orfas = [...divida].filter(chave => !dividaUsada.has(chave));
for (const chave of orfas) {
  problemas.push({
    arquivo: "diretrizes/COLUNAS-SEM-MIGRATION.json",
    linha: 1,
    o_que: `\`${chave}\` está declarada como dívida e nenhuma consulta precisa dela — retire a linha`
  });
}

if (problemas.length) {
  console.error("Consulta pedindo coluna que a tabela não tem (VACINA-036):\n");
  for (const p of problemas) console.error(`  ${p.arquivo}:${p.linha} — ${p.o_que}`);
  console.error(
    "\nA coluna foi escrita por expectativa de convenção, não a partir do schema. O PostgreSQL só\n" +
      "reclama quando o fluxo finalmente atravessa aquele trecho — e aí aborta a transação inteira.\n" +
      "Confira o `create table` da migration antes de nomear a coluna."
  );
  process.exit(1);
}

console.log(
  `Consultas conferidas contra as migrations: ${selectsConferidos} \`.select()\` com ${colunasConferidas} ` +
    `coluna(s) e ${filtrosConferidos} filtro(s)/ordenação(ões), sobre ${tabelas.size} tabela(s) reconstruídas — ` +
    `todas as colunas existem. Fora do alcance: ${pulados} consulta(s) a relação que não nasce de ` +
    `\`create table\` (${naoTabela.size} view(s) e afins) ou a tabela não declarada nas migrations. ` +
    `Dívida declarada em \`COLUNAS-SEM-MIGRATION.json\`: ${divida.size} coluna(s) que existem no banco e ` +
    `nenhuma migration declara — o número só pode cair.`
);
