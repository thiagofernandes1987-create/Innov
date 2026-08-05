// Gera `diretrizes/MAPA-DO-CODIGO.md` a partir do código, e confere que o
// arquivo commitado continua correspondendo.
//
// **Documentação escrita à mão sobre estrutura envelhece em uma semana.** Ela
// não envelhece porque quem escreve é desleixado; envelhece porque a estrutura
// muda num arquivo e o documento mora noutro, e nada liga os dois. Um mapa que
// diverge do código é pior que mapa nenhum: quem confia nele procura no lugar
// errado e conclui que a função não existe.
//
// Por isso este mapa é **gerado**, e o CI reprova quando o arquivo commitado
// diverge do que o código produz hoje (`--verificar`). Regenerar é parte de
// mudar a estrutura, do mesmo jeito que rodar o teste é parte de mudar o
// comportamento.
//
// Além de listar, o gerador **confronta**, e é daí que vem o valor de
// prevenção:
//
//   - RPC chamada no código e não declarada em migration nenhuma — a chamada
//     falha em execução e nenhuma ferramenta avisa;
//   - função de `lib/` exportada e nunca importada — código morto que continua
//     sendo mantido e revisado;
//   - server action nunca referenciada por tela nenhuma;
//   - módulo de `lib/` sem nenhum teste que o cite.
//
// As três primeiras reprovam. A última não: ela é medida e publicada, porque
// exigir teste de tudo hoje reprovaria o repositório inteiro e transformaria o
// validador em ruído que se aprende a ignorar.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const DESTINO = path.join(raiz, "diretrizes", "MAPA-DO-CODIGO.md");
const verificar = process.argv.includes("--verificar");

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

function arquivos(dir, extensoes, saida = []) {
  if (!fs.existsSync(dir)) return saida;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name === "node_modules" || item.name.startsWith(".")) continue;
    const caminho = path.join(dir, item.name);
    if (item.isDirectory()) arquivos(caminho, extensoes, saida);
    else if (extensoes.some(e => item.name.endsWith(e))) saida.push(caminho);
  }
  return saida;
}

const rel = p => path.relative(raiz, p).split(path.sep).join("/");
const ler = p => fs.readFileSync(p, "utf8");

const codigo = arquivos(path.join(raiz, "app"), [".ts", ".tsx"])
  .concat(arquivos(path.join(raiz, "lib"), [".ts", ".tsx"]))
  .concat(arquivos(path.join(raiz, "components"), [".ts", ".tsx"]));

const testes = arquivos(path.join(raiz, "tests"), [".test.ts", ".test.tsx"]);
const migrations = arquivos(path.join(raiz, "supabase", "migrations"), [".sql"]).sort();
const validadores = fs
  .readdirSync(path.join(raiz, "scripts"))
  .filter(n => /^validate-.*\.mjs$/.test(n))
  .sort();

const textoDe = new Map(codigo.map(f => [f, ler(f)]));
const textoDeTeste = new Map(testes.map(f => [f, ler(f)]));

/* ------------------------------------------------------------------ */
/* Grafo de importação — resolvido, não casado por texto                */
/* ------------------------------------------------------------------ */

/**
 * Cada `from "..."` resolvido para caminho do repositório, sem extensão.
 *
 * Casar o texto `"@/lib/x"` não serve: metade do repositório importa por
 * caminho relativo (`./docx`, `../xml`), e a primeira versão deste gerador
 * acusou oito módulos de órfãos por não enxergar essa metade. Resolver o
 * especificador contra a pasta do arquivo que importa é o único jeito de a
 * resposta ser a mesma que a do compilador.
 */
function especificadores(arquivo, texto) {
  const achados = [];
  for (const m of texto.matchAll(/(?:from|import)\s*\(?\s*["'`]([^"'`]+)["'`]/g)) {
    const spec = m[1];
    if (spec.startsWith("@/")) achados.push(spec.slice(2));
    else if (spec.startsWith(".")) achados.push(rel(path.resolve(path.dirname(arquivo), spec)));
  }
  return achados.map(s => s.replace(/\.(tsx?|jsx?)$/, ""));
}

const importados = new Set();
/** Nomes trazidos por `import { a, b } from "..."`, por módulo de destino. */
const nomesImportados = new Map();
for (const f of [...codigo, ...testes]) {
  const texto = textoDe.get(f) ?? textoDeTeste.get(f);
  for (const alvo of especificadores(f, texto)) importados.add(alvo);
  for (const m of texto.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'`]([^"'`]+)["'`]/g)) {
    const spec = m[2];
    const alvo = spec.startsWith("@/")
      ? spec.slice(2)
      : spec.startsWith(".")
        ? rel(path.resolve(path.dirname(f), spec))
        : spec;
    const chave = alvo.replace(/\.(tsx?|jsx?)$/, "");
    const nomes = m[1].split(",").map(n => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    nomesImportados.set(chave, new Set([...(nomesImportados.get(chave) ?? []), ...nomes]));
  }
}

/* ------------------------------------------------------------------ */
/* 1. Aplicativos                                                      */
/* ------------------------------------------------------------------ */

function aplicativos() {
  const registro = ler(path.join(raiz, "lib", "modules", "registry.ts"));
  const linhas = [...registro.matchAll(
    /\{\s*key:\s*"([a-z0-9_]+)"[^}]*?name:\s*"([^"]+)"[^}]*?routePrefix:\s*"([^"]+)"/g
  )];
  return linhas.map(m => ({ chave: m[1], nome: m[2], rota: m[3] }));
}

/* ------------------------------------------------------------------ */
/* 2. Rotas                                                            */
/* ------------------------------------------------------------------ */

/** A capacidade exigida, quando a página declara uma. */
function guardaDe(texto) {
  const cap = /requireCapability\(\s*"([a-z0-9_]+)"\s*,\s*"([a-z0-9_]+)"/.exec(texto);
  if (cap) return `${cap[1]}:${cap[2]}`;
  if (/requireAccessAdministration\(/.test(texto)) return "administracao:manage";
  const papeis = /requireOrganizationContext\(\s*\[([^\]]*)\]/.exec(texto);
  if (papeis) return "papéis: " + papeis[1].replace(/["\s]/g, "").split(",").filter(Boolean).join(", ");
  if (/requireOrganizationContext\(/.test(texto)) return "sessão da organização";
  return "—";
}

function rotas() {
  return codigo
    .filter(f => /\/(page|route)\.tsx?$/.test(rel(f)) && rel(f).startsWith("app/"))
    .map(f => {
      const caminho = rel(f);
      const url =
        "/" +
        caminho
          .replace(/^app\//, "")
          .replace(/\/(page|route)\.tsx?$/, "")
          .replace(/\(([^)]+)\)\//g, "");
      return {
        url: url === "/" ? "/" : url,
        arquivo: caminho,
        tipo: /route\.ts$/.test(caminho) ? "API" : "página",
        guarda: guardaDe(textoDe.get(f))
      };
    })
    .sort((a, b) => a.url.localeCompare(b.url, "pt-BR"));
}

/* ------------------------------------------------------------------ */
/* 3. Server actions                                                   */
/* ------------------------------------------------------------------ */

function acoes() {
  const saida = [];
  for (const f of codigo) {
    const texto = textoDe.get(f);
    if (!/^\s*["']use server["']/m.test(texto)) continue;
    for (const m of texto.matchAll(/export\s+async\s+function\s+([a-zA-Z0-9_]+)/g)) {
      const corpo = texto.slice(m.index, m.index + 1200);
      saida.push({ arquivo: rel(f), nome: m[1], guarda: guardaDe(corpo) });
    }
  }
  return saida.sort((a, b) => a.arquivo.localeCompare(b.arquivo) || a.nome.localeCompare(b.nome));
}

/* ------------------------------------------------------------------ */
/* 4. Bibliotecas                                                      */
/* ------------------------------------------------------------------ */

function bibliotecas() {
  return codigo
    // Teste que mora dentro de `lib/` é teste, não biblioteca. Contá-lo como
    // módulo fazia o gerador acusar sete "órfãos" que são suítes rodando.
    .filter(f => rel(f).startsWith("lib/") && !/\.test\.tsx?$/.test(rel(f)))
    .map(f => {
      const texto = textoDe.get(f);
      const nomes = [
        ...texto.matchAll(/export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)/g),
        ...texto.matchAll(/export\s+const\s+([a-zA-Z0-9_]+)/g)
      ].map(m => m[1]);
      const caminho = rel(f);
      const semExtensao = caminho.replace(/\.tsx?$/, "");
      const modulo = "@/" + semExtensao;
      return {
        arquivo: caminho,
        modulo,
        exportados: [...new Set(nomes)].sort(),
        importado: importados.has(semExtensao),
        testado: testes.some(t => especificadores(t, textoDeTeste.get(t)).includes(semExtensao))
      };
    })
    .sort((a, b) => a.arquivo.localeCompare(b.arquivo));
}

/* ------------------------------------------------------------------ */
/* 5. Funções do banco                                                 */
/* ------------------------------------------------------------------ */

function funcoesDoBanco() {
  const declaradas = new Map();
  for (const f of migrations) {
    const sql = ler(f).replace(/--[^\n]*/g, "");
    for (const m of sql.matchAll(/create\s+or\s+replace\s+function\s+public\.([a-z0-9_]+)/gi)) {
      declaradas.set(m[1], rel(f));
    }
    for (const m of sql.matchAll(/create\s+function\s+public\.([a-z0-9_]+)/gi)) {
      if (!declaradas.has(m[1])) declaradas.set(m[1], rel(f));
    }
  }

  const chamadas = new Map();
  for (const f of codigo) {
    for (const m of textoDe.get(f).matchAll(/\.rpc\(\s*["'`]([a-z0-9_]+)["'`]/g)) {
      chamadas.set(m[1], [...(chamadas.get(m[1]) ?? []), rel(f)]);
    }
  }
  return { declaradas, chamadas };
}

/* ------------------------------------------------------------------ */
/* 6. Testes                                                           */
/* ------------------------------------------------------------------ */

function suites() {
  return testes
    .map(f => {
      const texto = textoDeTeste.get(f);
      const casos = (texto.match(/\bit\(/g) ?? []).length;
      const blocos = [...texto.matchAll(/describe\(\s*["'`]([^"'`]+)/g)].map(m => m[1]);
      return { arquivo: rel(f), casos, blocos };
    })
    .sort((a, b) => a.arquivo.localeCompare(b.arquivo));
}

/* ------------------------------------------------------------------ */
/* Confronto                                                           */
/* ------------------------------------------------------------------ */

const apps = aplicativos();
const listaRotas = rotas();
const listaAcoes = acoes();
const libs = bibliotecas();
const { declaradas, chamadas } = funcoesDoBanco();
const listaTestes = suites();

const rpcSemDeclaracao = [...chamadas.keys()].filter(n => !declaradas.has(n)).sort();
const libsOrfas = libs.filter(l => !l.importado && !/\/(index|tipos|types)\.tsx?$/.test(l.arquivo));
// Referência por importação nomeada, não por busca de texto: o nome da ação
// aparece em comentário, em teste e em outra função do próprio arquivo, e a
// busca textual daria "usada" para ação que ninguém importa.
const acoesOrfas = listaAcoes.filter(
  a => !(nomesImportados.get(a.arquivo.replace(/\.tsx?$/, "")) ?? new Set()).has(a.nome)
);
const libsSemTeste = libs.filter(l => !l.testado);

/* ------------------------------------------------------------------ */
/* Escrita                                                             */
/* ------------------------------------------------------------------ */

const tabela = (cabecalho, linhas) =>
  [`| ${cabecalho.join(" | ")} |`, `|${cabecalho.map(() => "---").join("|")}|`, ...linhas].join("\n");

const partes = [];
partes.push(`# Mapa do código — Innovar Platform

**Documento canônico:** sim
**Gerado por:** \`pnpm mapa:codigo\` — **não editar à mão**
**Conferido por:** \`pnpm validate:code-map\`, no CI

Documentação de estrutura escrita à mão envelhece em uma semana. Não por
desleixo: a estrutura muda num arquivo, o documento mora noutro, e nada liga os
dois. Mapa que diverge do código é pior que mapa nenhum — quem confia nele
procura no lugar errado e conclui que a função não existe.

Este mapa é gerado do código e conferido no CI. Mudou a estrutura, regenere:
é parte da mudança, como rodar o teste é parte de mudar comportamento.

## O que este mapa reprova

| Confronto | Por que reprova |
|---|---|
| RPC chamada no código sem \`create function\` em migration nenhuma | A chamada falha em execução, e nem \`typecheck\` nem teste unitário veem |
| Módulo de \`lib/\` exportado e nunca importado | Código morto continua sendo mantido, revisado e migrado junto |
| Server action que nenhuma tela referencia | Idem, com o agravante de ser superfície exposta |

Cobertura de teste por módulo é **medida e publicada**, não exigida: reprovar
tudo o que não tem teste hoje transformaria o validador em ruído que se aprende
a ignorar.

## Números

| | |
|---|---|
| Aplicativos no registro | ${apps.length} |
| Rotas | ${listaRotas.length} (${listaRotas.filter(r => r.tipo === "página").length} páginas, ${listaRotas.filter(r => r.tipo === "API").length} de API) |
| Server actions | ${listaAcoes.length} em ${new Set(listaAcoes.map(a => a.arquivo)).size} arquivos |
| Módulos de \`lib/\` | ${libs.length} |
| Funções do banco declaradas | ${declaradas.size} |
| Funções do banco chamadas do código | ${chamadas.size} |
| Suítes de teste | ${listaTestes.length}, com ${listaTestes.reduce((s, t) => s + t.casos, 0)} casos |
| Migrations | ${migrations.length} |
| Validadores de CI | ${validadores.length} |
| Módulos de \`lib/\` citados por algum teste | ${libs.filter(l => l.testado).length} de ${libs.length} |
`);

partes.push(`\n## 1. Aplicativos\n\n${tabela(
  ["Chave", "Nome", "Rota"],
  apps.map(a => `| \`${a.chave}\` | ${a.nome} | \`${a.rota}\` |`)
)}\n`);

partes.push(`\n## 2. Rotas\n\nA coluna **guarda** mostra o que a rota exige antes de responder.\n\n${tabela(
  ["Rota", "Tipo", "Guarda", "Arquivo"],
  listaRotas.map(r => `| \`${r.url}\` | ${r.tipo} | ${r.guarda} | \`${r.arquivo}\` |`)
)}\n`);

const porArquivo = new Map();
for (const a of listaAcoes) porArquivo.set(a.arquivo, [...(porArquivo.get(a.arquivo) ?? []), a]);
partes.push(`\n## 3. Server actions\n\nTodo arquivo \`"use server"\` só exporta função assíncrona (VACINA-047), conferido por \`pnpm validate:server-actions\`.\n`);
for (const [arquivo, lista] of [...porArquivo.entries()].sort()) {
  partes.push(`\n### \`${arquivo}\`\n\n${tabela(
    ["Função", "Guarda"],
    lista.map(a => `| \`${a.nome}\` | ${a.guarda} |`)
  )}\n`);
}

partes.push(`\n## 4. Módulos de \`lib/\`\n\n**T** = citado por alguma suíte de teste.\n\n${tabela(
  ["Módulo", "T", "Exportados"],
  libs.map(l => `| \`${l.modulo}\` | ${l.testado ? "sim" : "não"} | ${l.exportados.length ? l.exportados.map(n => `\`${n}\``).join(", ") : "—"} |`)
)}\n`);

partes.push(`\n## 5. Funções do banco\n\nDeclaradas em migration e chamadas por \`.rpc()\`.\n\n${tabela(
  ["Função", "Declarada em", "Chamada de"],
  [...declaradas.keys()].sort().map(nome => {
    const usos = chamadas.get(nome);
    return `| \`${nome}\` | \`${declaradas.get(nome)}\` | ${usos ? [...new Set(usos)].map(u => `\`${u}\``).join(", ") : "— (só por SQL ou trigger)"} |`;
  })
)}\n`);

partes.push(`\n## 6. Testes\n\n${tabela(
  ["Suíte", "Casos", "O que cobre"],
  listaTestes.map(t => `| \`${t.arquivo}\` | ${t.casos} | ${t.blocos.slice(0, 4).join("; ") || "—"} |`)
)}\n`);

partes.push(`\n## 7. Validadores de CI\n\n${tabela(
  ["Script"],
  validadores.map(v => `| \`scripts/${v}\` |`)
)}\n`);

partes.push(`\n## 8. Lacunas medidas\n
| Lacuna | Quantidade |
|---|---|
| RPC chamada sem declaração em migration | ${rpcSemDeclaracao.length} |
| Módulo de \`lib/\` nunca importado | ${libsOrfas.length} |
| Server action nunca referenciada | ${acoesOrfas.length} |
| Módulo de \`lib/\` sem teste que o cite | ${libsSemTeste.length} de ${libs.length} |
`);

if (libsSemTeste.length) {
  partes.push(`\n### Módulos sem teste que os cite\n\nMedido, não exigido. A lista existe para escolher onde o próximo teste rende mais.\n\n${libsSemTeste
    .map(l => `- \`${l.modulo}\``)
    .join("\n")}\n`);
}

const conteudo = partes.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";

/* ------------------------------------------------------------------ */
/* Saída                                                               */
/* ------------------------------------------------------------------ */

/**
 * Débito conhecido, congelado.
 *
 * Reprovar tudo o que já está aberto deixaria o CI vermelho até a S-22
 * terminar — e validador permanentemente vermelho é validador que se aprende a
 * ignorar, que é como a proteção morre. O que já existe fica registrado aqui,
 * com quem responde por ele; **qualquer item novo reprova**.
 *
 * Tirar um item desta lista é conserto. Acrescentar um item só se justifica com
 * a decisão de quem responde pelo repositório, nunca para fazer o CI passar.
 */
const BASE = path.join(raiz, "diretrizes", "mapa-do-codigo.debito.json");
const debito = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, "utf8")) : { rpc: [], libs: [], acoes: [] };

const problemas = [];
for (const nome of rpcSemDeclaracao) {
  if (debito.rpc.includes(nome)) continue;
  problemas.push(
    `RPC \`${nome}\` é chamada em ${[...new Set(chamadas.get(nome))].join(", ")} e não tem ` +
      "`create function` em migration nenhuma — a chamada falha em execução."
  );
}
for (const l of libsOrfas) {
  if (debito.libs.includes(l.modulo)) continue;
  problemas.push(`Módulo \`${l.modulo}\` não é importado por ninguém.`);
}
for (const a of acoesOrfas) {
  if ((debito.acoes ?? []).includes(`${a.arquivo}#${a.nome}`)) continue;
  problemas.push(`Server action \`${a.nome}\` (${a.arquivo}) não é referenciada por nenhuma tela.`);
}

/** Débito registrado que já foi consertado — a lista precisa encolher sozinha. */
const debitoResolvido = [
  ...debito.rpc.filter(n => !rpcSemDeclaracao.includes(n)).map(n => `RPC ${n}`),
  ...debito.libs.filter(m => !libsOrfas.some(l => l.modulo === m)).map(m => `módulo ${m}`),
  ...(debito.acoes ?? []).filter(a => !acoesOrfas.some(o => `${o.arquivo}#${o.nome}` === a)).map(a => `ação ${a}`)
];
for (const item of debitoResolvido) {
  problemas.push(`${item} está no débito congelado e já não é problema — tire da lista.`);
}

if (verificar) {
  const atual = fs.existsSync(DESTINO) ? fs.readFileSync(DESTINO, "utf8") : "";
  if (atual !== conteudo) {
    console.error(
      "O mapa do código está desatualizado em relação ao código.\n" +
        "Rode `pnpm mapa:codigo` e commite o resultado junto da mudança de estrutura."
    );
    process.exit(1);
  }
  if (problemas.length) {
    console.error("Confrontos reprovados:\n");
    for (const p of problemas) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(
    `Mapa do código conferido: ${listaRotas.length} rotas, ${listaAcoes.length} server actions, ` +
      `${libs.length} módulos de lib, ${declaradas.size} funções do banco, nenhum confronto aberto.`
  );
} else {
  fs.writeFileSync(DESTINO, conteudo);
  console.log(`Mapa gerado em ${rel(DESTINO)} — ${conteudo.split("\n").length} linhas.`);
  if (problemas.length) {
    console.log(`\n${problemas.length} confronto(s) aberto(s):`);
    for (const p of problemas) console.log(`  - ${p}`);
  }
}
