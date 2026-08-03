// Atualiza o instantâneo do ledger que `validate:migrations-applied` compara.
//
// O CI não alcança o banco, então a comparação da VACINA-057 é feita contra um
// arquivo commitado. Este script é o que produz esse arquivo — quem tem
// credencial roda e commita junto da migration.
//
// **Sem este script o validador seria uma instrução para lugar nenhum.** A
// primeira versão da VACINA-057 mandava rodar `pnpm ledger:atualizar` e o
// comando não existia: um verificador que aponta para um procedimento ausente
// é o mesmo defeito que ele foi escrito para impedir, com outro nome.
//
//   SUPABASE_DB_URL='postgres://...' pnpm ledger:atualizar
//
// Sobre o débito congelado: entradas que **deixaram de divergir** são podadas
// aqui e o script diz quais. Débito que continua congelado depois de resolvido
// vira permissão silenciosa — se o arquivo sumir de novo, nada reprova.

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const raiz = process.cwd();
const MIGRATIONS = path.join(raiz, "supabase", "migrations");
const LEDGER = path.join(raiz, "diretrizes", "migrations-aplicadas.json");

const url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "";
if (!url) {
  console.error(
    "Defina SUPABASE_DB_URL (ou DATABASE_URL) com a string de conexão do banco.\n" +
      "Sem credencial não há como saber o que está aplicado — e chutar aqui é pior que não medir."
  );
  process.exit(1);
}

/** O nome lógico da migration, sem o carimbo. Mesma regra do validador. */
function nomeLogico(nome) {
  return nome.replace(/^\d{14}_/, "").replace(/\.sql$/, "");
}

function psql(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn(
      "psql",
      [url, "--no-psqlrc", "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1", "--command", sql],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let saida = "";
    let erro = "";
    p.stdout.on("data", d => (saida += d));
    p.stderr.on("data", d => (erro += d));
    p.on("error", reject);
    p.on("close", codigo =>
      codigo === 0 ? resolve(saida) : reject(new Error(erro.trim() || `psql saiu com ${codigo}`))
    );
  });
}

// `name` é o nome lógico com que a migration foi aplicada; `version` é o
// carimbo que o servidor gravou no instante da aplicação. Nome vazio acontece
// em aplicação por SQL direto — aí o carimbo é tudo que existe.
const SQL =
  "select coalesce(nullif(name, ''), version) " +
  "from supabase_migrations.schema_migrations order by version;";

const saida = await psql(SQL).catch(e => {
  console.error(`Falha ao ler o ledger no banco: ${e.message}`);
  process.exit(1);
});

const aplicadas = [
  ...new Set(
    saida
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .map(nomeLogico)
  )
].sort();

const arquivos = new Set(
  fs
    .readdirSync(MIGRATIONS)
    .filter(n => n.endsWith(".sql"))
    .map(nomeLogico)
);

const anterior = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, "utf8")) : {};
const debitoAnterior = anterior.debito ?? {};

const conjuntoAplicadas = new Set(aplicadas);

// Poda: só continua congelado o que ainda diverge de fato.
const semArquivo = (debitoAnterior.aplicadas_sem_arquivo ?? [])
  .filter(n => conjuntoAplicadas.has(n) && !arquivos.has(n))
  .sort();
const semAplicacao = (debitoAnterior.arquivos_sem_aplicacao ?? [])
  .filter(n => arquivos.has(n) && !conjuntoAplicadas.has(n))
  .sort();

const podadas = [
  ...(debitoAnterior.aplicadas_sem_arquivo ?? []).filter(n => !semArquivo.includes(n)),
  ...(debitoAnterior.arquivos_sem_aplicacao ?? []).filter(n => !semAplicacao.includes(n))
];

const ledger = {
  ...anterior,
  atualizado_em: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  aplicadas,
  debito: { ...debitoAnterior, aplicadas_sem_arquivo: semArquivo, arquivos_sem_aplicacao: semAplicacao }
};

fs.writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");

console.log(
  `Ledger atualizado: ${aplicadas.length} aplicada(s), ${arquivos.size} arquivo(s), ` +
    `débito congelado ${semArquivo.length} sem arquivo / ${semAplicacao.length} sem aplicação.`
);
if (podadas.length) {
  console.log(`Débito resolvido e retirado do congelamento (${podadas.length}):`);
  for (const nome of podadas) console.log(`  - ${nome}`);
}
