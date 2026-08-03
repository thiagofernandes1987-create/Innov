// Prevenção executável da VACINA-057-VALIDADOR-CONFERE-O-ARTEFATO-E-NAO-O-EFEITO.md.
//
// **Arquivo de migration não é migration aplicada.** As duas coisas divergem em
// silêncio, e o repositório não tinha nada que comparasse uma com a outra:
//
//   - `validate:object-runtime` lê os arquivos e confere que declaram RLS,
//     orçamento de slots e imutabilidade. Passou por quarenta dias enquanto as
//     três tabelas **não existiam no banco**.
//   - `test:db:object-runtime` cria um banco do zero a partir dos mesmos
//     arquivos e testa nele. Também passou — testando exatamente o artefato que
//     ninguém tinha aplicado.
//
// Os dois estavam verdes e a funcionalidade estava ausente. Nenhum dos dois
// mentiu: os dois responderam a pergunta que sabiam responder, e ninguém fazia
// a outra.
//
// Este validador compara o conjunto de arquivos com o **ledger de aplicadas**,
// gravado em `diretrizes/migrations-aplicadas.json`. Como o CI não alcança o
// banco, o instantâneo é commitado e datado: quem tem credencial roda
// `pnpm ledger:atualizar` e commita junto. Instantâneo velho aparece na
// revisão; ausência de instantâneo reprova.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const MIGRATIONS = path.join(raiz, "supabase", "migrations");
const LEDGER = path.join(raiz, "diretrizes", "migrations-aplicadas.json");

/**
 * Quantos dias um instantâneo continua servindo.
 *
 * Não é prazo de validade do banco: é o ponto em que "conferido recentemente"
 * deixa de ser verdade e a revisão precisa saber disso. Trinta dias cobrem um
 * ciclo de trabalho sem transformar o validador em alarme diário.
 */
const IDADE_MAXIMA_EM_DIAS = 30;

/**
 * O nome lógico da migration, sem o carimbo.
 *
 * A comparação é por **nome**, não por número: o ledger carimba a versão no
 * instante da aplicação, então `20260803235000_listas_cadastradas_por_escopo.sql`
 * aparece aplicada como `20260803182502`. Comparar por número dava 111 arquivos
 * "não aplicados" de 152 — um resultado sem sentido que teria virado baseline.
 */
function nomeLogico(arquivo) {
  return arquivo.replace(/^\d{14}_/, "").replace(/\.sql$/, "");
}

function temCarimbo(nome) {
  return /^\d{14}_/.test(nome);
}

const erros = [];
const avisos = [];

if (!fs.existsSync(LEDGER)) {
  console.error(
    `Instantâneo do ledger ausente: ${path.relative(raiz, LEDGER)}\n` +
      "Rode `pnpm ledger:atualizar` com credencial de banco e commite o resultado."
  );
  process.exit(1);
}

const ledger = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
const aplicadas = new Set(ledger.aplicadas ?? []);
const conhecidas = {
  semArquivo: new Set(ledger.debito?.aplicadas_sem_arquivo ?? []),
  semAplicacao: new Set(ledger.debito?.arquivos_sem_aplicacao ?? [])
};

const arquivos = fs.existsSync(MIGRATIONS)
  ? fs.readdirSync(MIGRATIONS).filter(n => n.endsWith(".sql")).sort()
  : [];

const nomesDeArquivo = new Set();
for (const arquivo of arquivos) {
  if (!temCarimbo(arquivo)) {
    erros.push(`Migration sem carimbo de 14 dígitos no nome: ${arquivo}`);
    continue;
  }
  const nome = nomeLogico(arquivo);
  nomesDeArquivo.add(nome);
  if (!aplicadas.has(nome) && !conhecidas.semAplicacao.has(nome)) {
    erros.push(
      `Migration \`${arquivo}\` existe como arquivo e **não consta como aplicada**. ` +
        "Arquivo que ninguém aplicou é funcionalidade que não existe — foi assim que as três " +
        "tabelas do Object Runtime passaram quarenta dias ausentes com o validador verde."
    );
  }
}

for (const nome of aplicadas) {
  if (!nomesDeArquivo.has(nome) && !conhecidas.semArquivo.has(nome)) {
    erros.push(
      `\`${nome}\` consta aplicada no banco e **não tem arquivo** no repositório. ` +
        "O repositório deixa de reconstruir o que está em produção. Aplicar com nome diferente " +
        "do arquivo produz exatamente isto."
    );
  }
}

/* Idade do instantâneo — informação de revisão, não reprovação. */
const atualizado = Date.parse(ledger.atualizado_em ?? "");
if (!Number.isFinite(atualizado)) {
  erros.push("O instantâneo do ledger não tem `atualizado_em` legível.");
} else {
  const dias = Math.floor((Date.now() - atualizado) / 86_400_000);
  if (dias > IDADE_MAXIMA_EM_DIAS) {
    avisos.push(
      `O instantâneo do ledger tem ${dias} dias. Rode \`pnpm ledger:atualizar\` para reconfirmar.`
    );
  }
}

if (erros.length) {
  console.error("Divergência entre arquivos de migration e o que está aplicado:\n");
  for (const erro of erros) console.error(`  - ${erro}`);
  console.error(
    `\n${erros.length} divergência(s). O débito já conhecido está congelado em ` +
      "`diretrizes/migrations-aplicadas.json` com responsável nomeado; só o que é novo reprova."
  );
  process.exit(1);
}

for (const aviso of avisos) console.warn(`aviso: ${aviso}`);
console.log(
  `Migrations conferidas contra o ledger: ${arquivos.length} arquivo(s), ` +
    `${aplicadas.size} aplicada(s), nenhuma divergência nova.`
);
