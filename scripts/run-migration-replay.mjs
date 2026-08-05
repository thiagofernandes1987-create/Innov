import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Responde uma pergunta só, e por execução: o repositório, sozinho, reconstrói
// o banco da plataforma?
//
// `diretrizes/RECUPERACAO.md` promete que o projeto pode ser recuperado a
// partir do GitHub. Promessa de recuperação que nunca foi executada é
// suposição. Este script executa.
//
// Sem PostgreSQL acessível, sai 0 e diz que não rodou — nunca finge sucesso.

const BOOTSTRAP = "supabase/tests/replay/bootstrap.sql";
const MIGRATIONS = "supabase/migrations";
const database = process.env.MIGRATION_REPLAY_DB ?? "migration_replay";
const exigir = process.argv.includes("--exigir");

if (!fs.existsSync(BOOTSTRAP)) {
  console.error(`Bootstrap ausente: ${BOOTSTRAP}`);
  process.exit(1);
}

function psql(args) {
  return execFileSync("bash", ["-c", `psql ${args.map(a => `'${a}'`).join(" ")} 2>&1`], { encoding: "utf8" });
}

try {
  psql(["-U", "postgres", "-d", "postgres", "-tAc", `drop database if exists ${database}`]);
  psql(["-U", "postgres", "-d", "postgres", "-tAc", `create database ${database}`]);
} catch (error) {
  // Sair 0 aqui é o comportamento certo para quem roda na mão sem banco, e o
  // errado para quem depende do resultado: "não rodou" fica indistinguível de
  // "passou" para qualquer automação que só olhe o código de saída. Com
  // `--exigir`, a ausência da dependência reprova (VACINA-056).
  console.log("PostgreSQL indisponível: replay das migrations NÃO foi executado.");
  console.log(`Motivo: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
  if (exigir) {
    console.error("`--exigir` foi pedido: sem banco não há verificação, e sem verificação não há aprovação.");
    process.exit(1);
  }
  process.exit(0);
}

const connection = ["-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-q"];
psql([...connection, "-f", BOOTSTRAP]);

const files = fs.readdirSync(MIGRATIONS).filter(file => file.endsWith(".sql")).sort();
let applied = 0;
let failure = null;

for (const file of files) {
  const full = path.join(MIGRATIONS, file);
  try {
    psql([...connection, "-f", full]);
    applied += 1;
  } catch (error) {
    const output = error instanceof Error && "stdout" in error ? String(error.stdout ?? "") : String(error);
    const line = output.split("\n").find(text => text.includes("ERROR:")) ?? output.split("\n")[0];
    failure = { file, line: line.trim() };
    break;
  }
}

console.log(`Migrations aplicadas em base limpa: ${applied} de ${files.length}.`);

if (failure) {
  console.error(`\nParou em: ${failure.file}`);
  console.error(failure.line);
  console.error(
    "\nO repositório não reconstrói o banco sozinho. Enquanto isto falhar, `diretrizes/RECUPERACAO.md` promete algo que não se cumpre."
  );
  process.exit(1);
}

console.log("O repositório reconstrói o esquema a partir de uma base limpa.");
