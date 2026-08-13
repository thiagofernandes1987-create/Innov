// Recria o banco do zero e aplica as 273 migrations em ordem.
//
// ## O que ele faz, e nessa ordem
//
//   1. confere o alvo contra `diretrizes/BANCO-ALVO.json` — antes de tudo
//   2. mede o que está lá agora, e imprime
//   3. exige a confirmação literal
//   4. roda `supabase/reset/recriar-do-zero.sql`
//   5. mede de novo, e prova que o schema ficou vazio
//
// O passo 5 não é enfeite: `drop schema cascade` que falhou parcialmente
// deixaria o lote seguinte aplicando por cima de resto, que é exatamente o
// estado do qual estamos saindo.
//
// ## Por que é um comando separado do `--aplicar`
//
// Porque destruir e construir são decisões diferentes, e juntá-las num só
// botão faz com que quem quer só aplicar corra o risco de apagar. A aplicação
// continua em `aplicar-migrations-pendentes.mjs`; aqui só se apaga.
//
// ## Uso
//
//   node scripts/recriar-banco-do-zero.mjs --conferir
//       mede e imprime o que seria apagado. **Não toca no banco.**
//
//   node scripts/recriar-banco-do-zero.mjs --recriar --confirmar RECRIAR
//       apaga o schema `public` e o histórico de migrations.

import path from "node:path";
import { execFileSync } from "node:child_process";
import { anunciarAlvoOuSair } from "./banco-alvo.mjs";

const raiz = process.cwd();
const RESET = path.join(raiz, "supabase", "reset", "recriar-do-zero.sql");

const args = process.argv.slice(2);
const conferir = args.includes("--conferir");
const recriar = args.includes("--recriar");
const confirmacao = (() => {
  const i = args.indexOf("--confirmar");
  return i === -1 ? "" : (args[i + 1] ?? "");
})();

if (conferir === recriar) {
  console.error("Use `--conferir` (não toca no banco) ou `--recriar`. Nunca os dois, nunca nenhum.");
  process.exit(2);
}

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error(
    "SUPABASE_DB_URL está vazia. Apagar schema é a última coisa que se faz às cegas:\n" +
      "sem saber com qual banco se está falando, este comando não roda."
  );
  process.exit(2);
}

anunciarAlvoOuSair(url);

/** Uma consulta, uma linha, sem imprimir a conexão. */
function medir() {
  const sql =
    "select (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace " +
    "where n.nspname='public' and c.relkind in ('r','p')) || '|' || " +
    "(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public') || '|' || " +
    "(select count(*) from supabase_migrations.schema_migrations) || '|' || " +
    "(select count(*) from auth.users)";
  try {
    const saida = execFileSync(
      "psql",
      [url, "--no-psqlrc", "--tuples-only", "--no-align", "-v", "ON_ERROR_STOP=1", "-c", sql],
      { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }
    ).trim();
    const [tabelas, funcoes, migrations, usuarios] = saida.split("|").map(Number);
    return { tabelas, funcoes, migrations, usuarios };
  } catch (erro) {
    const texto = `${erro.stdout ?? ""}${erro.stderr ?? ""}`.replace(/postgres(ql)?:\/\/[^\s]*/g, "<credencial>");
    console.error("Não consegui medir o banco antes de mexer nele. Não sigo.\n" + texto.split("\n").slice(0, 8).join("\n"));
    process.exit(2);
  }
}

// A confirmação é conferida **antes de abrir conexão**, e a ordem é o ponto.
//
// Na primeira versão ela vinha depois da medição — e a prova por sabotagem
// mostrou que, com credencial inválida, o script recusava por não conseguir
// medir e o portão da palavra literal nunca chegava a rodar. Portão que só é
// alcançado quando tudo mais deu certo não foi provado: num ambiente com
// conexão válida ele seria a primeira coisa a decidir, e a última a ter sido
// testada.
if (recriar && confirmacao !== "RECRIAR") {
  console.error(
    "Recusado: `--recriar` exige `--confirmar RECRIAR`, com a palavra literal.\n" +
      `Recebi ${confirmacao ? `\`${confirmacao}\`` : "nada"}.\n\n` +
      "Nada foi enviado ao banco — nem sequer uma conexão foi aberta.\n" +
      "Não há ponto de retorno para esta operação. A confirmação é a única coisa entre\n" +
      "um comando digitado por engano e um schema apagado."
  );
  process.exit(2);
}

const antes = medir();
console.log("");
console.log("Estado atual do banco:");
console.log(`  tabelas em public ......... ${antes.tabelas}`);
console.log(`  funções em public ......... ${antes.funcoes}`);
console.log(`  histórico de migrations ... ${antes.migrations}`);
console.log(`  contas em auth.users ...... ${antes.usuarios}   (sobrevivem — o reset não toca em auth)`);
console.log("");

if (conferir) {
  console.log(
    "Isto é `--conferir`: nada foi enviado ao banco.\n\n" +
      "O que o `--recriar` faria: apagar o schema `public` inteiro e zerar o histórico de\n" +
      "migrations, recriando os privilégios de fábrica do Supabase. As contas de `auth.users`\n" +
      "ficam; o que some é a linha delas em `public`, que a semeadura de homologação recria.\n\n" +
      "Ponto de retorno: **não há**. É por isso que exige a palavra literal."
  );
  process.exit(0);
}

console.log("Apagando o schema `public` e o histórico de migrations…");
try {
  execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "--single-transaction", "-q", "-f", RESET], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8"
  });
} catch (erro) {
  const texto = `${erro.stdout ?? ""}${erro.stderr ?? ""}`.replace(/postgres(ql)?:\/\/[^\s]*/g, "<credencial>");
  console.error("FALHA ao recriar. A transação inteira voltou atrás — o banco está como estava.\n" + texto.split("\n").slice(0, 12).join("\n"));
  process.exit(1);
}

const depois = medir();
console.log("");
console.log("Estado depois:");
console.log(`  tabelas em public ......... ${depois.tabelas}   (era ${antes.tabelas})`);
console.log(`  funções em public ......... ${depois.funcoes}   (era ${antes.funcoes})`);
console.log(`  histórico de migrations ... ${depois.migrations}   (era ${antes.migrations})`);
console.log(`  contas em auth.users ...... ${depois.usuarios}   (era ${antes.usuarios})`);
console.log("");

// Verde não é evidência. O que prova que o reset funcionou é o zero medido,
// não o comando ter voltado sem erro.
if (depois.tabelas !== 0 || depois.funcoes !== 0 || depois.migrations !== 0) {
  console.error(
    "O reset não deixou o schema vazio, e isso é pior que ter falhado:\n" +
      "o lote seguinte aplicaria por cima de resto, que é o estado do qual estamos saindo.\n" +
      "Não siga para a aplicação."
  );
  process.exit(1);
}

console.log("Schema vazio e histórico zerado, conferido por medição.");
console.log("Próximo passo: `aplicar-migrations-pendentes.mjs --aplicar --todas --com-destrutivas`.");
