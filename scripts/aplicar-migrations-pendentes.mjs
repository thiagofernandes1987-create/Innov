// Aplica as migrations pendentes, em ordem, uma transação por arquivo.
//
// ## Por que existe
//
// O débito de `diretrizes/migrations-aplicadas.json` chegou a **121 arquivos**.
// Aplicar isso pelo MCP significa colar 0,88 MB de SQL em 121 chamadas — e
// parar no meio de 121 migrations ordenadas é o pior desfecho possível: deixa o
// banco num estado que nem o repositório nem o ledger descrevem.
//
// Este script existe para que a aplicação seja **um comando com evidência**, e
// não uma sequência manual que depende de ninguém se distrair.
//
// ## A disciplina que ele impõe, e de onde ela vem
//
// É a mesma da S-69, que aplicou as duas primeiras:
//
//   ordem            filename crescente, que é a ordem em que foram escritas
//   transação        uma por arquivo — `--single-transaction` com
//                    `ON_ERROR_STOP=1`, então um arquivo entra inteiro ou não
//                    entra
//   parada           no primeiro erro, sem tentar o próximo. Migration ordenada
//                    que falha no meio costuma deixar a seguinte sem
//                    pré-requisito, e insistir transforma um erro em dez
//   destrutiva       fora do lote por padrão. A T-69.2 manda separar, e são
//                    quatro: elas apagam tabela, coluna ou linha, e a decisão
//                    de cada uma é do proprietário, não do lote
//   evidência        o que entrou, em que ordem, e com que saída
//
// ## Como usar
//
//   node scripts/aplicar-migrations-pendentes.mjs --conferir
//       imprime o plano e **não toca no banco**. É o passo obrigatório antes.
//
//   node scripts/aplicar-migrations-pendentes.mjs --aplicar [--ate N]
//       aplica; `--ate` limita o lote para quem quiser avançar por partes.
//
//   node scripts/aplicar-migrations-pendentes.mjs --aplicar --com-destrutivas
//       inclui as quatro que perdem dado. Exige a decisão registrada.
//
// `SUPABASE_DB_URL` é lida do ambiente e **nunca impressa**. Prefira a conexão
// direta (`db.<ref>.supabase.co:5432`) à do pooler: o pooler em modo transaction
// não suporta bem DDL em lote.
//
// ## O alvo é conferido antes de abrir conexão
//
// Desde 12/08/2026, e pelo motivo da S-79: dois dias de trabalho de banco foram
// para o projeto errado porque o alvo era **herdado** — parâmetro de ferramenta
// num caso, segredo opaco no runner no outro, invisível nos dois. Aqui o alvo é
// comparado com `diretrizes/BANCO-ALVO.json` e anunciado antes da primeira
// migration. `--conferir` também o imprime, e é assim que se descobre para onde
// `secrets.SUPABASE_DB_URL` aponta sem nunca imprimi-la.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { alvoDeclarado, anunciarAlvoOuSair } from "./banco-alvo.mjs";

const raiz = process.cwd();
const MIGRATIONS = path.join(raiz, "supabase", "migrations");
const LEDGER = path.join(raiz, "diretrizes", "migrations-aplicadas.json");

const args = process.argv.slice(2);
const conferir = args.includes("--conferir");
const aplicar = args.includes("--aplicar");
const comDestrutivas = args.includes("--com-destrutivas");
// Depois de `recriar-banco-do-zero.mjs`, o ledger não descreve mais o banco:
// ele lista o que estava aplicado antes do reset. `--todas` ignora o ledger e
// aplica os 273 arquivos em ordem, que é o único plano correto para um schema
// que acabou de nascer vazio.
const aplicarTodas = args.includes("--todas");
const ate = (() => {
  const i = args.indexOf("--ate");
  return i === -1 ? Infinity : Number(args[i + 1]);
})();

if (conferir === aplicar) {
  console.error("Use `--conferir` (não toca no banco) ou `--aplicar`. Nunca os dois, nunca nenhum.");
  process.exit(2);
}

// O alvo é a **primeira** coisa impressa, antes até de contar o lote. A ordem
// não é estética: um plano de 119 migrations impresso acima da linha do alvo é
// um plano que se lê inteiro antes de descobrir para onde ele vai — e foi
// exatamente lendo o conteúdo certo sem olhar o destino que a S-79 aconteceu.
{
  const canonico = alvoDeclarado();
  console.log(
    `Alvo declarado: \`${canonico.project_ref}\` (${canonico.nome_de_exibicao}), ` +
      `em diretrizes/BANCO-ALVO.json desde ${canonico.declarado_em}.`
  );
  // Em `--conferir` a conexão pode não existir no ambiente, e isso não reprova:
  // conferir plano sem credencial é uso legítimo. O que não pode é existir uma
  // conexão apontando para outro lugar e o plano sair como se estivesse certo.
  if (process.env.SUPABASE_DB_URL) anunciarAlvoOuSair(process.env.SUPABASE_DB_URL);
  else if (conferir) console.log("SUPABASE_DB_URL não está neste ambiente — o alvo real será conferido no `--aplicar`.");
  console.log("");
}

/**
 * Destrutiva é a que **perde dado**, não a que tem a palavra `drop`.
 *
 * `drop trigger if exists` antes de recriar é idempotência, e 63 das 121 fazem
 * isso. Contar essas como destrutivas encheria a lista de exceções e faria o
 * corte perder o sentido — que é justamente separar o que não volta.
 *
 * O reconhecimento ignora corpo de função: `delete from` dentro de uma
 * `create function` é o que a função faz quando alguém a chama, não o que a
 * migration faz ao ser aplicada.
 */
function perdeDado(sql) {
  const semComentario = sql.replace(/--[^\n]*/g, "");
  const semCorpoDeFuncao = semComentario.replace(/\$\$[\s\S]*?\$\$/g, "");
  return /\b(drop\s+table|drop\s+column|truncate\s|delete\s+from|drop\s+schema)\b/i.test(semCorpoDeFuncao);
}

const chaveDoArquivo = nome => nome.replace(/^\d+_/, "").replace(/\.sql$/, "");

const ledger = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
const debito = new Set(ledger.debito.arquivos_sem_aplicacao);

const todas_os_arquivos = fs.readdirSync(MIGRATIONS).filter(n => n.endsWith(".sql")).sort();
const pendentes = todas_os_arquivos.filter(n => aplicarTodas || debito.has(chaveDoArquivo(n)));

const classificadas = pendentes.map(nome => {
  const sql = fs.readFileSync(path.join(MIGRATIONS, nome), "utf8");
  return { nome, destrutiva: perdeDado(sql), bytes: sql.length };
});

const doLote = classificadas.filter(m => comDestrutivas || !m.destrutiva).slice(0, ate);
const foraDoLote = classificadas.filter(m => !doLote.includes(m));

console.log(
  aplicarTodas
    ? `Aplicando TODAS as ${classificadas.length} migrations do repositório (ledger ignorado por --todas)`
    : `Pendentes no ledger: ${classificadas.length}`
);
console.log(`  no lote ..........: ${doLote.length}`);
console.log(`  fora do lote .....: ${foraDoLote.length}` +
  (comDestrutivas ? "" : `  (${classificadas.filter(m => m.destrutiva).length} destrutiva(s) + limite --ate)`));
console.log("");

if (foraDoLote.some(m => m.destrutiva)) {
  console.log("Destrutivas, fora do lote por padrão — cada uma é decisão própria:");
  for (const m of foraDoLote.filter(x => x.destrutiva)) console.log(`  ${m.nome}`);
  console.log("");
}

if (conferir) {
  console.log("Ordem de aplicação:");
  for (const [i, m] of doLote.entries()) {
    console.log(`  ${String(i + 1).padStart(3)}. ${m.nome}${m.destrutiva ? "   << PERDE DADO" : ""}`);
  }
  console.log(
    "\nPonto de retorno: cada arquivo entra em transação própria, então um erro não deixa " +
      "arquivo pela metade.\nO que já entrou continua aplicado — a volta é reaplicar a definição " +
      "anterior, que está versionada.\nNada foi enviado ao banco: isto é `--conferir`."
  );
  process.exit(0);
}

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error(
    "SUPABASE_DB_URL não está no ambiente.\n" +
      "Ela é injetada na criação do contêiner: se foi configurada agora, é preciso uma sessão nova.\n" +
      "Prefira a conexão direta (`db.<ref>.supabase.co:5432`) à do pooler."
  );
  process.exit(2);
}

anunciarAlvoOuSair(url);

const aplicadasAgora = [];
for (const [i, m] of doLote.entries()) {
  const rotulo = `${String(i + 1).padStart(3)}/${doLote.length} ${m.nome}`;
  try {
    execFileSync(
      "psql",
      [url, "-v", "ON_ERROR_STOP=1", "--single-transaction", "-q", "-f", path.join(MIGRATIONS, m.nome)],
      { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }
    );
    aplicadasAgora.push(m.nome);
    console.log(`  ok    ${rotulo}`);
  } catch (erro) {
    console.error(`  FALHA ${rotulo}`);
    // A saída do psql pode conter a URL em mensagem de conexão; corta a
    // credencial antes de imprimir, porque relatório de erro é lido em voz alta
    // e colado em conversa.
    const saida = `${erro.stdout ?? ""}${erro.stderr ?? ""}`.replace(/postgres(ql)?:\/\/[^\s]*/g, "<credencial>");
    console.error(saida.split("\n").slice(0, 12).map(l => `        ${l}`).join("\n"));
    console.error(
      `\nParado no ${i + 1}º arquivo. ${aplicadasAgora.length} entraram e continuam aplicadas.\n` +
        "Não sigo para o próximo: migration ordenada que falha costuma deixar a seguinte sem\n" +
        "pré-requisito, e insistir transforma um erro em dez."
    );
    break;
  }
}

console.log(`\nAplicadas nesta execução: ${aplicadasAgora.length} de ${doLote.length}.`);
if (aplicadasAgora.length) {
  console.log(
    "Próximo passo obrigatório: `SUPABASE_DB_URL=... pnpm ledger:atualizar` e tirar do débito\n" +
      "**só o que de fato entrou** — o ledger que não bate com o banco é pior que ledger nenhum."
  );
}
process.exit(aplicadasAgora.length === doLote.length ? 0 : 1);
