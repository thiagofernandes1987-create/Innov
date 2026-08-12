// Função `security definer` que recebe a organização como parâmetro e é
// executável pelo usuário final precisa conferir participação.
//
// Por que existe. `security definer` roda com os privilégios do dono da
// função, e por isso **não passa por RLS**. Quando essa função ainda recebe
// como parâmetro justamente o campo que separa uma empresa da outra, o
// `organization_id`, ela vira uma porta que ignora a política e aceita o
// destino de quem bate. Sem uma conferência explícita no corpo, qualquer
// usuário autenticado de qualquer organização chama com o UUID de outra.
//
// O caso que originou o portão: `20260804200000_stage22_ai_bridge.sql` criou
// seis definidoras irmãs, todas recebendo `p_organization_id`, todas concedidas
// a `authenticated`. Três abrem com
// `has_module_permission(p_organization_id,'whatsapp','EDIT',...)`. Três não
// abriam com nada. `reserve_channel_ai_budget` aceitava o UUID de qualquer
// empresa e somava no orçamento diário de IA dela — negação de serviço em
// vizinho, sem ler uma linha de dado alheio. A diferença entre as seis não
// reprovava nada: estão no mesmo arquivo, do mesmo dia, e todas passavam.
//
// O que este portão confere, e o que ele deliberadamente não confere:
//
//   confere    : definidora + parâmetro de organização + execução concedida a
//                authenticated/anon no estado final => precisa citar um guarda
//   não confere: se o guarda está **correto**. Chamar `is_org_member` com o
//                parâmetro errado passa aqui. Portão de presença não substitui
//                revisão; ele só impede o esquecimento, que é o caso comum.
//
// Gatilho não entra: é invocado pelo banco, não pelo cliente, e no momento da
// criação da organização ainda não existe participação para conferir.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const MIGRATIONS = path.join(raiz, "supabase", "migrations");

/** Guardas aceitos: qualquer um deles no corpo satisfaz a exigência. */
const GUARDAS = [
  "is_org_member",
  "has_org_role",
  "has_module_permission",
  "is_client_owner",
  "can_access_project",
  "can_manage_project",
  "auth.uid()"
];

/**
 * O corpo termina no fecho da citação em cifrão, não na função seguinte.
 *
 * Terminar o corpo na próxima `create function` — que foi a segunda versão
 * deste portão — faz cada função herdar o texto que a separa da vizinha. Foi
 * assim que `set_user_module_capability_override` passou despercebida: ela
 * confere `has_org_role`, que não estava na lista de guardas, e deveria ter
 * sido acusada; o recorte largo alcançou o `auth.uid()` da função seguinte e
 * deu por conferida uma função que o portão nunca leu direito. Falso negativo
 * é pior que falso positivo: o falso positivo incomoda até alguém olhar, o
 * falso negativo é silêncio que parece aprovação.
 */
function corpoDaFuncao(texto, inicio, limite) {
  const abertura = /\bas\s+(\$[a-z_]*\$)/i.exec(texto.slice(inicio, limite));
  if (!abertura) return texto.slice(inicio, limite);
  const inicioDoCorpo = inicio + abertura.index + abertura[0].length;
  const fecho = texto.indexOf(abertura[1], inicioDoCorpo);
  return texto.slice(inicio, fecho === -1 ? limite : fecho + abertura[1].length);
}

/**
 * Exceções declaradas, com motivo. Entrada aqui não é permissão silenciosa:
 * é decisão escrita, e quem adicionar precisa dizer por quê.
 */
const SEM_GUARDA_POR_DECISAO = new Map([]);

/**
 * O estado final é o que existe no banco, não a soma do histórico.
 *
 * Migration é sequência aplicada em ordem, e cada arquivo posterior corrige o
 * anterior: `create or replace` troca o corpo, `alter function ... security
 * invoker` rebaixa o privilégio, `revoke` retira o que um `grant` antigo deu.
 * Ler os arquivos como um saco de declarações — que foi a primeira versão
 * deste portão — acusa `write_audit` e `ensure_organization_module_defaults`,
 * as duas revogadas de `authenticated` justamente para fechar este risco, e
 * acusa `search_sinapi_references`, que a VACINA-004 rebaixou para
 * `security invoker`. Três acusações falsas em sete: portão que lê histórico
 * em vez de estado final gasta a confiança de quem o lê.
 *
 * Por isso tudo aqui é reduzido em ordem cronológica de arquivo, e vence a
 * última declaração.
 */
function eventos() {
  if (!fs.existsSync(MIGRATIONS)) return [];
  const arquivos = fs
    .readdirSync(MIGRATIONS)
    .filter(nome => nome.endsWith(".sql"))
    .sort();

  const lista = [];
  for (const nome of arquivos) {
    // Comentário some antes de qualquer casamento: `-- grant execute ...` em
    // texto explicativo não é concessão.
    const texto = fs.readFileSync(path.join(MIGRATIONS, nome), "utf8").replace(/--[^\n]*/g, "");

    const marcas = [
      ...texto.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.([a-z0-9_]+)\s*\(/gi)
    ];
    for (let i = 0; i < marcas.length; i += 1) {
      const fim = i + 1 < marcas.length ? marcas[i + 1].index : texto.length;
      lista.push({
        tipo: "define",
        nome: marcas[i][1].toLowerCase(),
        corpo: corpoDaFuncao(texto, marcas[i].index, fim),
        arquivo: nome,
        pos: marcas[i].index
      });
    }

    for (const m of texto.matchAll(
      /alter\s+function\s+public\.([a-z0-9_]+)\s*\([^)]*\)\s*security\s+(invoker|definer)/gi
    )) {
      lista.push({
        tipo: "privilegio",
        nome: m[1].toLowerCase(),
        definer: m[2].toLowerCase() === "definer",
        arquivo: nome,
        pos: m.index
      });
    }

    for (const m of texto.matchAll(/drop\s+function\s+(?:if\s+exists\s+)?public\.([a-z0-9_]+)/gi)) {
      lista.push({ tipo: "remove", nome: m[1].toLowerCase(), arquivo: nome, pos: m.index });
    }

    // `grant execute on function public.f(args) to a, b` e o `revoke` simétrico.
    // A chave é o nome, não a assinatura: sobrecarga com privilégio divergente
    // não existe hoje no esquema, e tratar por nome erra para o lado de
    // conferir demais, nunca de menos.
    for (const m of texto.matchAll(
      /(grant|revoke)\s+(?:execute|all)(?:\s+privileges)?\s+on\s+function\s+public\.([a-z0-9_]+)\s*\([^)]*\)\s*(?:to|from)\s+([a-z_,\s]+)/gi
    )) {
      lista.push({
        tipo: m[1].toLowerCase() === "grant" ? "concede" : "revoga",
        nome: m[2].toLowerCase(),
        papeis: m[3]
          .split(",")
          .map(p => p.trim().toLowerCase())
          .filter(Boolean),
        arquivo: nome,
        pos: m.index
      });
    }
  }

  return lista.sort((a, b) => (a.arquivo === b.arquivo ? a.pos - b.pos : a.arquivo < b.arquivo ? -1 : 1));
}

/** Papéis que representam o usuário final chegando pelo navegador. */
const PAPEIS_DO_USUARIO_FINAL = ["authenticated", "anon"];

const estado = new Map();
function daFuncao(nome) {
  if (!estado.has(nome)) {
    estado.set(nome, { corpo: "", definer: false, papeis: new Set(), existe: false });
  }
  return estado.get(nome);
}

for (const evento of eventos()) {
  const f = daFuncao(evento.nome);
  switch (evento.tipo) {
    case "define":
      f.corpo = evento.corpo;
      f.definer = /security\s+definer/i.test(evento.corpo);
      f.existe = true;
      break;
    case "privilegio":
      f.definer = evento.definer;
      break;
    case "remove":
      f.existe = false;
      f.papeis.clear();
      break;
    case "concede":
      for (const papel of evento.papeis) {
        if (PAPEIS_DO_USUARIO_FINAL.includes(papel)) f.papeis.add(papel);
      }
      break;
    case "revoga":
      // `revoke ... from public` retira o privilégio herdado por todos, mas não
      // a concessão nominal a `authenticated`; só o que está nomeado sai.
      for (const papel of evento.papeis) f.papeis.delete(papel);
      break;
  }
}

const problemas = [];
let conferidas = 0;

for (const [nome, f] of estado) {
  if (!f.existe || !f.definer) continue;

  // Gatilho: invocado pelo banco, não pelo cliente.
  if (/returns\s+trigger/i.test(f.corpo)) continue;

  // Recebe a organização como parâmetro?
  const assinatura = /\(([\s\S]*?)\)\s*returns/i.exec(f.corpo)?.[1] ?? "";
  if (!/\b(p_)?organization_id\s+uuid/i.test(assinatura)) continue;

  if (f.papeis.size === 0) continue;

  conferidas += 1;
  if (SEM_GUARDA_POR_DECISAO.has(nome)) continue;

  if (!GUARDAS.some(g => f.corpo.includes(g))) {
    problemas.push({ nome, papeis: [...f.papeis].sort() });
  }
}

if (problemas.length) {
  console.error("Funções `security definer` que recebem a organização e não conferem participação:\n");
  for (const { nome, papeis } of problemas) {
    console.error(`  - public.${nome}(...) — executável por ${papeis.join(", ")}`);
  }
  console.error(
    "\n`security definer` não passa por RLS. Recebendo `organization_id` como parâmetro e sem guarda no corpo,\n" +
      "qualquer usuário autenticado de qualquer organização chama com o UUID de outra.\n" +
      `Guardas aceitos: ${GUARDAS.join(", ")}.`
  );
  process.exit(1);
}

console.log(
  `Funções definidoras conferidas: ${conferidas} recebem a organização por parâmetro e são executáveis pelo ` +
    `usuário final; todas conferem participação. Exceções declaradas: ${SEM_GUARDA_POR_DECISAO.size}.`
);
