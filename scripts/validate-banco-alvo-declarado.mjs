// O banco alvo é declarado, e tudo que fala com ele bate com a declaração.
//
// ## Por que existe
//
// Em 11 e 12/08/2026 dois dias de medição e duas migrations foram para o
// projeto Supabase errado. Não havia configuração apontando para o lugar
// errado — havia **ausência de conferência**. O `project_ref` do MCP é
// parâmetro de chamada, a `SUPABASE_DB_URL` é segredo opaco no runner, e nada
// no repositório dizia qual era o banco desta plataforma. Eu escolhi de uma
// lista e segui.
//
// A classe do erro é a mesma que este repositório vinha catalogando na semana:
// **medir a coisa parecida em vez da coisa**. O `validate:prevencao-declarada`
// media o disco em vez do repositório; a S-69 media o repositório em vez do
// banco; a S-79 mediu *um* banco em vez *do* banco.
//
// ## O que ele confere
//
//   1. `diretrizes/BANCO-ALVO.json` existe e declara um `project_ref` válido.
//   2. O `project_ref` do `.mcp.json` é o declarado. **É a conferência que
//      teria pego o erro no primeiro minuto.**
//   3. Todo script que lê `SUPABASE_DB_URL` passa por `banco-alvo.mjs` antes de
//      abrir conexão. Quem escrever o quarto script reprova aqui.
//   4. Todo workflow que usa `secrets.SUPABASE_DB_URL` roda a conferência.
//   5. Nenhum `project_ref` diferente do declarado aparece no repositório sem
//      **data no mesmo bloco**. Referência datada é registro histórico e fica;
//      referência sem data é instrução para o lugar errado — foi exatamente
//      assim que `docs/ETAPA-10` ficou três semanas com um `--project-id`
//      copiável apontando para o projeto que não é o desta plataforma.
//
// A exceção do item 5 é a mesma do `validate:prevencao-declarada`, e pelo mesmo
// motivo: **medição datada não envelhece.** Reescrever uma medição de julho
// para citar o projeto certo falsificaria o registro — a medição foi feita onde
// foi feita. O que não pode ficar sem data é a linha que alguém vai copiar.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PADRAO_DE_REF, alvoDeclarado } from "./banco-alvo.mjs";

const raiz = process.cwd();
const problemas = [];

// ---------------------------------------------------------------------------
// 1. A declaração existe e é válida.
// ---------------------------------------------------------------------------

let alvo;
try {
  alvo = alvoDeclarado();
} catch (erro) {
  console.error("Declaração do banco alvo ausente ou inválida:\n\n  " + erro.message);
  process.exit(1);
}

for (const campo of ["nome_de_exibicao", "declarado_em", "por_que"]) {
  if (!String(alvo[campo] ?? "").trim()) {
    problemas.push({
      onde: "diretrizes/BANCO-ALVO.json",
      o_que: `falta \`${campo}\` — declaração sem ${campo} não diz de quando é nem por quê`
    });
  }
}

const REF = alvo.project_ref;

// ---------------------------------------------------------------------------
// 2. O MCP aponta para o projeto declarado.
// ---------------------------------------------------------------------------

const MCP = path.join(raiz, ".mcp.json");
if (fs.existsSync(MCP)) {
  const texto = fs.readFileSync(MCP, "utf8");
  const refs = [...texto.matchAll(/project_ref=([a-z]{20})/g)].map(m => m[1]);
  if (!refs.length) {
    problemas.push({
      onde: ".mcp.json",
      o_que: "o servidor supabase não fixa `project_ref` — sem ele o projeto vira parâmetro de chamada, que é o que causou a S-79"
    });
  }
  for (const ref of refs) {
    if (ref !== REF) {
      problemas.push({
        onde: ".mcp.json",
        o_que: `\`project_ref=${ref}\` e o alvo declarado é \`${REF}\` — o MCP fala com outro banco`
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Todo script que lê a string de conexão confere o alvo.
// ---------------------------------------------------------------------------

const arquivosDoGit = execFileSync("git", ["ls-files"], { cwd: raiz, encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter(c => !c.startsWith(".claude/skills/"));

// Duas perguntas, não uma. Quem fala com o banco **da plataforma** confere que
// é ele; quem cria banco **descartável** confere que não é ele. A primeira
// versão deste portão fazia só a primeira pergunta e acusou os seis
// `run-*-db-tests.mjs`, cujo alvo certo é justamente outro — acusação errada,
// da mesma família que este repositório vem corrigindo a semana toda.
const LE_PLATAFORMA = /process\.env\.SUPABASE_DB_URL/;
const LE_DESCARTAVEL = /process\.env\.DATABASE_URL/;
const CRIA_BANCO = /\b(?:create|drop)\s+database\b/i;
const IMPORTA = /from\s*["']\.\/banco-alvo\.mjs["']/;
const CONFERE_ALVO = /anunciarAlvoOuSair\(|exigirAlvoDeclarado\(/;
const RECUSA_PLATAFORMA = /recusarBancoDaPlataforma\(/;

let scriptsConferidos = 0;
let scriptsDescartaveis = 0;

for (const relativo of arquivosDoGit.filter(c => c.startsWith("scripts/") && /\.(mjs|js|ts)$/.test(c))) {
  if (relativo === "scripts/banco-alvo.mjs") continue;
  const texto = fs.readFileSync(path.join(raiz, relativo), "utf8");

  if (LE_PLATAFORMA.test(texto)) {
    scriptsConferidos += 1;
    if (!(IMPORTA.test(texto) && CONFERE_ALVO.test(texto))) {
      problemas.push({
        onde: relativo,
        o_que: "lê `SUPABASE_DB_URL` e não confere o alvo — importe `./banco-alvo.mjs` e chame `anunciarAlvoOuSair(url)` antes de abrir conexão"
      });
    }
  }

  if (LE_DESCARTAVEL.test(texto) && CRIA_BANCO.test(texto)) {
    scriptsDescartaveis += 1;
    if (!(IMPORTA.test(texto) && RECUSA_PLATAFORMA.test(texto))) {
      problemas.push({
        onde: relativo,
        o_que: "cria ou derruba banco a partir de `DATABASE_URL` e não recusa projeto Supabase — chame `recusarBancoDaPlataforma(url)`, porque aqui alvo errado é `drop database` no lugar errado"
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Todo workflow que usa o segredo roda a conferência.
// ---------------------------------------------------------------------------

let workflowsConferidos = 0;
for (const relativo of arquivosDoGit.filter(c => c.startsWith(".github/workflows/") && /\.ya?ml$/.test(c))) {
  const texto = fs.readFileSync(path.join(raiz, relativo), "utf8");
  if (!/secrets\.SUPABASE_DB_URL/.test(texto)) continue;
  workflowsConferidos += 1;
  if (/scripts\/banco-alvo\.mjs/.test(texto) || /run-stage20-backup-restore-drill\.mjs/.test(texto)) continue;
  problemas.push({
    onde: relativo,
    o_que: "usa `secrets.SUPABASE_DB_URL` sem conferir o alvo — acrescente um passo `node scripts/banco-alvo.mjs --conferir` antes de qualquer uso"
  });
}

// ---------------------------------------------------------------------------
// 5. Referência a outro projeto só com data no mesmo bloco.
// ---------------------------------------------------------------------------

const CITACOES = [
  /project_ref=([a-z]{20})/g,
  /--project-id[= ]+([a-z]{20})/g,
  /https?:\/\/([a-z]{20})\.supabase\.(?:co|com)/g,
  /db\.([a-z]{20})\.supabase\.(?:co|com)/g,
  /`([a-z]{20})`/g
];
const DATA = /\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2} de [a-zç]+ de \d{4}/i;
const TEXTO = /\.(md|json|mjs|js|ts|tsx|yml|yaml|toml|sql|txt)$/;

/** O bloco de uma linha: as linhas não vazias grudadas nela, acima e abaixo. */
function bloco(linhas, i) {
  let inicio = i;
  let fim = i;
  while (inicio > 0 && linhas[inicio - 1].trim()) inicio -= 1;
  while (fim < linhas.length - 1 && linhas[fim + 1].trim()) fim += 1;
  return linhas.slice(inicio, fim + 1).join("\n");
}

let citacoesConferidas = 0;
for (const relativo of arquivosDoGit.filter(c => TEXTO.test(c))) {
  const texto = fs.readFileSync(path.join(raiz, relativo), "utf8");
  if (!/[a-z]{20}/.test(texto)) continue;
  const linhas = texto.split("\n");
  for (const [i, linha] of linhas.entries()) {
    for (const padrao of CITACOES) {
      for (const achado of linha.matchAll(padrao)) {
        const ref = achado[1];
        if (!PADRAO_DE_REF.test(ref) || ref === REF) continue;
        citacoesConferidas += 1;
        if (DATA.test(bloco(linhas, i))) continue;
        problemas.push({
          onde: `${relativo}:${i + 1}`,
          o_que: `cita o projeto \`${ref}\`, que não é o alvo declarado (\`${REF}\`), e não há data no bloco — se é registro histórico, date-o; se é instrução, corrija o alvo`
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------

if (problemas.length) {
  console.error("Alvo do banco não declarado ou não conferido (S-79):\n");
  for (const p of problemas) console.error(`  ${p.onde} — ${p.o_que}`);
  console.error(
    "\nO alvo desta plataforma é declarado em `diretrizes/BANCO-ALVO.json` e conferido por\n" +
      "`scripts/banco-alvo.mjs`. Alvo herdado de configuração invisível custou dois dias de\n" +
      "trabalho de banco em 11 e 12/08/2026, e a única coisa que faltava era comparar."
  );
  process.exit(1);
}

console.log(
  `Alvo do banco declarado e conferido: \`${REF}\` (${alvo.nome_de_exibicao}), desde ${alvo.declarado_em}. ` +
    `${scriptsConferidos} script(s) leem \`SUPABASE_DB_URL\` e todos conferem antes de abrir; ` +
    `${scriptsDescartaveis} script(s) criam banco descartável e todos recusam projeto Supabase; ` +
    `${workflowsConferidos} workflow(s) usam o segredo e todos anunciam o alvo; ` +
    `${citacoesConferidas} citação(ões) a outro projeto, todas datadas.`
);
