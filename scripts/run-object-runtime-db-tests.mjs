import { execFileSync } from "node:child_process";
import fs from "node:fs";

// Executa os testes de comportamento do catálogo do Object Runtime contra um
// PostgreSQL real. Sem banco disponível, sai com código 0 e diz que não rodou —
// pular em silêncio é como um teste ausente vira "teste passando".
//
// Banco alvo: DATABASE_URL, ou um cluster local acessível por psql.

const files = [
  "supabase/tests/object-runtime/fixture.sql",
  "supabase/migrations/20260726090000_object_runtime_definition_catalog.sql",
  "supabase/migrations/20260726093000_object_runtime_publication.sql",
  "supabase/tests/object-runtime/catalog.test.sql"
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`Arquivo ausente: ${file}`);
    process.exit(1);
  }
}

const url = process.env.DATABASE_URL ?? "";
const database = process.env.OBJECT_RUNTIME_TEST_DB ?? "object_runtime_test";

// `raise notice` do PostgreSQL sai por stderr. Sem redirecionar, um script que
// não executa nenhum teste é indistinguível de um que executa todos.
function psql(args, options = {}) {
  return execFileSync("psql", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
}

function psqlWithNotices(args) {
  return execFileSync("bash", ["-c", `psql ${args.map(argument => `'${argument}'`).join(" ")} 2>&1`], {
    encoding: "utf8"
  });
}

let connection;
try {
  if (url) {
    connection = ["-d", url];
    psql([...connection, "-tAc", "select 1"]);
  } else {
    // Cluster local: recria o banco de teste do zero a cada execução.
    psql(["-U", "postgres", "-d", "postgres", "-tAc", `drop database if exists ${database}`]);
    psql(["-U", "postgres", "-d", "postgres", "-tAc", `create database ${database}`]);
    connection = ["-U", "postgres", "-d", database];
  }
} catch (error) {
  // Ver VACINA-056: com `--exigir`, faltar a dependência reprova, porque
  // "não rodou" e "passou" não podem sair com o mesmo código.
  console.log("PostgreSQL indisponível neste ambiente: testes de banco do Object Runtime NÃO foram executados.");
  console.log(`Motivo: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
  if (process.argv.includes("--exigir")) {
    console.error("`--exigir` foi pedido: sem banco não há verificação, e sem verificação não há aprovação.");
    process.exit(1);
  }
  process.exit(0);
}

let failed = false;
let approvals = 0;
for (const file of files) {
  try {
    const output = psqlWithNotices([...connection, "-v", "ON_ERROR_STOP=1", "-q", "-f", file]);
    for (const line of output.split("\n")) {
      const text = line.trim();
      if (!text) continue;
      console.log(text);
      if (/^ERROR:|^FATAL:/.test(text)) failed = true;
      if (/aprovad/i.test(text) || /recusada/i.test(text)) approvals += 1;
    }
    if (failed) {
      console.error(`Falha ao aplicar ${file}.`);
      break;
    }
  } catch (error) {
    failed = true;
    console.error(`Falha ao aplicar ${file}:\n${error instanceof Error ? error.message : String(error)}`);
    break;
  }
}

// Sucesso silencioso é o modo de falha mais caro: o script sairia 0 se o
// arquivo de teste não tivesse executado nenhum bloco.
const EXPECTED_APPROVALS = 2;
if (!failed && approvals < EXPECTED_APPROVALS) {
  console.error(
    `\nO script terminou sem erro mas produziu ${approvals} confirmação(ões) de ${EXPECTED_APPROVALS}. Os testes não executaram.`
  );
  process.exit(1);
}

if (failed) {
  console.error("\nTestes de banco do Object Runtime reprovados.");
  process.exit(1);
}

console.log("\nTestes de banco do Object Runtime aprovados.");
