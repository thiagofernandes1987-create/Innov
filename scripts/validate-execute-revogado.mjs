// VACINA-004 — função PostgreSQL herda `EXECUTE` de `PUBLIC` quando ninguém
// revoga.
//
// Por que existe. No PostgreSQL, `CREATE FUNCTION` concede `EXECUTE` a `PUBLIC`
// por padrão. `PUBLIC` inclui `anon`. Uma função pode validar permissão por
// dentro, ser `security definer`, ter RLS por baixo — e ainda assim aparecer
// como executável por visitante não autenticado no advisor, porque o privilégio
// nunca foi tirado. Segurança interna não remove exposição de endpoint.
//
// A VACINA-004 fixou a forma desde a etapa 10:
//
//   revoke all on function public.f(...) from public, anon;
//   grant execute on function public.f(...) to authenticated, service_role;
//
// e ela era conferida por auditoria manual no Supabase e por validadores de
// etapa, que olham funções nomeadas. Função nova de módulo novo não passava por
// nenhum dos dois. Este portão fecha isso, e é irmão do
// `validate-definer-com-guarda.mjs`: aquele pergunta se a função **confere
// participação**, este pergunta se ela **deveria ser chamável**.
//
// O que confere e o que não confere:
//
//   confere    : toda função de `public` no estado final teve `EXECUTE`
//                revogado de `public` em algum momento
//   não confere: se o `grant` seguinte é o correto. Conceder a `authenticated`
//                uma função que deveria ser só de `service_role` passa aqui —
//                é o `validate-definer-com-guarda` e a revisão que pegam.
//
// Gatilho **não** é exceção. Função de gatilho continua chamável por nome, e
// `perform public.tg_alguma_coisa()` de um cliente autenticado executa o corpo
// dela fora do contexto do gatilho, sem `NEW` e sem a proteção que o gatilho
// pressupõe. A VACINA-004 já dizia isso: "helpers, instaladores, triggers e
// funções auxiliares recebem execução apenas de `service_role` ou do
// proprietário".

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const MIGRATIONS = path.join(raiz, "supabase", "migrations");

/**
 * Débito declarado, datado, com motivo escrito — nunca regex silenciosa.
 *
 * Congelado em 11/08/2026 com 120 funções, das quais 77 são definidoras que não
 * são gatilho: essas ignoram RLS **e** herdam `EXECUTE` de `PUBLIC`, e são o
 * subconjunto a queimar primeiro. O arquivo separa as duas listas.
 *
 * Não foi corrigido de uma vez porque revogar em massa quebraria o produto: das
 * 120, **47 não têm `grant` explícito nenhum** e são chamadas pelo app —
 * revogar de `public` sem conceder a `authenticated` as tornaria inalcançáveis.
 * As outras 73 já têm grant, e nessas a revogação é segura.
 *
 * Este número **só pode cair**. Função nova sem `revoke` reprova, que é o que
 * impede a lista de crescer — foi exatamente assim que ela chegou a 120: a
 * VACINA-004 existia desde a etapa 10, aplicada módulo a módulo à mão, sem
 * portão que cobrasse o módulo seguinte.
 */
const debito = JSON.parse(fs.readFileSync(path.join(raiz, "diretrizes", "EXECUTE-PUBLIC-ACEITOS.json"), "utf8"));
const DEBITO = new Map(
  [...debito.prioridade_definidoras_nao_gatilho, ...debito.demais].map(nome => [nome, debito._medido_em])
);

function eventos() {
  if (!fs.existsSync(MIGRATIONS)) return [];
  const lista = [];
  for (const nome of fs.readdirSync(MIGRATIONS).filter(n => n.endsWith(".sql")).sort()) {
    // Comentário sai antes: `-- revoke ...` em texto explicativo não revoga nada.
    const texto = fs.readFileSync(path.join(MIGRATIONS, nome), "utf8").replace(/--[^\n]*/g, "");

    for (const m of texto.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.([a-z0-9_]+)\s*\(/gi)) {
      lista.push({ tipo: "define", nome: m[1].toLowerCase(), arquivo: nome, pos: m.index });
    }
    for (const m of texto.matchAll(/drop\s+function\s+(?:if\s+exists\s+)?public\.([a-z0-9_]+)/gi)) {
      lista.push({ tipo: "remove", nome: m[1].toLowerCase(), arquivo: nome, pos: m.index });
    }
    // `revoke ... on function public.f(...) from a, b` — e também a forma que
    // revoga do esquema inteiro, que é como a VACINA-059 foi aplicada.
    for (const m of texto.matchAll(
      /revoke\s+(?:all|execute)(?:\s+privileges)?\s+on\s+function\s+public\.([a-z0-9_]+)\s*\([^)]*\)\s*from\s+([a-z_,\s]+)/gi
    )) {
      lista.push({
        tipo: "revoga",
        nome: m[1].toLowerCase(),
        papeis: m[2].split(",").map(p => p.trim().toLowerCase()),
        arquivo: nome,
        pos: m.index
      });
    }
    // `revoke execute on all functions in schema public from public` — varredura
    // de esquema, que cobre tudo o que existia **naquele momento**.
    for (const m of texto.matchAll(
      /revoke\s+(?:all|execute)(?:\s+privileges)?\s+on\s+all\s+functions\s+in\s+schema\s+public\s+from\s+([a-z_,\s]+)/gi
    )) {
      lista.push({
        tipo: "revoga-esquema",
        papeis: m[1].split(",").map(p => p.trim().toLowerCase()),
        arquivo: nome,
        pos: m.index
      });
    }
  }
  return lista.sort((a, b) => (a.arquivo === b.arquivo ? a.pos - b.pos : a.arquivo < b.arquivo ? -1 : 1));
}

const estado = new Map();
function daFuncao(nome) {
  if (!estado.has(nome)) estado.set(nome, { existe: false, revogado: false });
  return estado.get(nome);
}

for (const e of eventos()) {
  if (e.tipo === "revoga-esquema") {
    // Vale para tudo o que já existe neste ponto da linha do tempo.
    if (e.papeis.includes("public")) {
      for (const f of estado.values()) if (f.existe) f.revogado = true;
    }
    continue;
  }
  const f = daFuncao(e.nome);
  if (e.tipo === "define") {
    // `CREATE OR REPLACE` preserva a ACL; `CREATE` de função nova nasce com
    // EXECUTE para PUBLIC. Como o texto não distingue com segurança o caso em
    // que a função é realmente nova, o portão erra para o lado de exigir o
    // `revoke` — que é a forma que a VACINA-004 manda escrever de qualquer jeito.
    f.existe = true;
  } else if (e.tipo === "remove") {
    f.existe = false;
    f.revogado = false;
  } else if (e.tipo === "revoga") {
    if (e.papeis.includes("public")) f.revogado = true;
  }
}

const problemas = [];
let conferidas = 0;
for (const [nome, f] of estado) {
  if (!f.existe) continue;
  conferidas += 1;
  if (DEBITO.has(nome)) continue;
  if (!f.revogado) problemas.push(nome);
}

if (problemas.length) {
  console.error("Funções sem `revoke ... from public` — herdam `EXECUTE` de `PUBLIC`, que inclui `anon`:\n");
  for (const nome of problemas.sort()) console.error(`  - public.${nome}(...)`);
  console.error(
    "\nNo PostgreSQL, `CREATE FUNCTION` concede `EXECUTE` a `PUBLIC` por padrão. Validar permissão por dentro\n" +
      "não remove a exposição do endpoint. A forma da VACINA-004:\n\n" +
      "  revoke all on function public.f(...) from public, anon;\n" +
      "  grant execute on function public.f(...) to authenticated, service_role;\n"
  );
  process.exit(1);
}

console.log(
  `Privilégio de execução conferido: ${conferidas} função(ões) em \`public\`, todas com \`EXECUTE\` revogado de ` +
    `\`PUBLIC\`. Débito declarado: ${DEBITO.size}.`
);
