import { execFileSync } from "node:child_process";
import fs from "node:fs";

// Testes de dependência de cronograma contra um PostgreSQL real.
//
// As migrations de planejamento entram por descoberta de nome, não por lista
// fixa — VACINA-014. O replay completo seria melhor, e não roda hoje: é a
// lacuna registrada na S-22, anterior a este trabalho.

const FIXTURES = ["supabase/tests/pipeline/fixture.sql", "supabase/tests/planejamento/fixture.sql"];
const TESTE = "supabase/tests/planejamento/dependencias.test.sql";
const database = process.env.PLANNING_TEST_DB ?? "planning_test";

for (const file of [...FIXTURES, TESTE]) {
  if (!fs.existsSync(file)) {
    console.error(`Arquivo ausente: ${file}`);
    process.exit(1);
  }
}

// Migrations de planejamento por descoberta — VACINA-014.
const migracoes = fs
  .readdirSync("supabase/migrations")
  .filter(n => /_stage12_planning_schema\.sql$|_planejamento_.*\.sql$/.test(n))
  .sort()
  .map(n => `supabase/migrations/${n}`);

if (migracoes.length === 0) {
  console.error("Nenhuma migration de planejamento encontrada.");
  process.exit(1);
}

function psql(args) {
  return execFileSync("bash", ["-c", `psql ${args.map(a => `'${a}'`).join(" ")} 2>&1`], { encoding: "utf8" });
}

try {
  psql(["-U", "postgres", "-d", "postgres", "-tAc", `drop database if exists ${database}`]);
  psql(["-U", "postgres", "-d", "postgres", "-tAc", `create database ${database}`]);
} catch (erro) {
  console.log("PostgreSQL indisponível: testes de planejamento NÃO foram executados.");
  console.log(`Motivo: ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(0);
}

const alvo = ["-U", "postgres", "-d", database];
console.log(`Migrations de planejamento no encadeamento: ${migracoes.length}`);

for (const arquivo of [...FIXTURES, ...migracoes, TESTE]) {
  const saida = psql([...alvo, "-v", "ON_ERROR_STOP=1", "-q", "-f", arquivo]);
  if (/^psql:.*ERROR:/im.test(saida)) {
    console.error(`Falha em ${arquivo}:\n${saida.split("\n").filter(l => /ERROR|CONTEXT/.test(l)).slice(0, 6).join("\n")}`);
    process.exit(1);
  }
  for (const linha of saida.split("\n").filter(l => /NOTICE:.*(aprovad|verificad)/i.test(l))) {
    console.log(linha.trim());
  }
}

console.log("\nTestes de dependência de cronograma aprovados.");
