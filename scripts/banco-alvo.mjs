// O banco alvo é declarado e conferido — nunca herdado.
//
// ## Por que existe
//
// Em 11 e 12/08/2026 todo o trabalho de banco foi contra o projeto errado.
// Não houve configuração apontando para o lugar errado: houve **ausência de
// conferência**. O `project_ref` do MCP é parâmetro de chamada, a
// `SUPABASE_DB_URL` é segredo opaco no runner, e nenhum dos dois é visível na
// hora em que se aperta o botão. O alvo era herdado.
//
// A diferença entre "estar errado" e "não ter medido" é a mesma quantidade de
// trabalho para desfazer. Este módulo fecha o segundo caso: antes de qualquer
// leitura ou escrita, o script diz em voz alta para onde vai, e compara com a
// declaração versionada em `diretrizes/BANCO-ALVO.json`.
//
// ## A regra
//
//   1. O alvo canônico está em `diretrizes/BANCO-ALVO.json`, em commit.
//   2. Quem executa pode declarar outro em `BANCO_ALVO` — um `project_ref` ou
//      a palavra `local`. Precisa ser **digitado**, e fica no comando e no log.
//   3. A string de conexão precisa apontar para o alvo declarado. Se não
//      apontar, o script recusa antes de abrir conexão.
//
// O item 2 não é uma porta dos fundos: é a diferença entre desviar por engano
// e desviar de propósito. `--com-destrutivas` e a confirmação literal `APLICAR`
// têm exatamente a mesma forma, e pelo mesmo motivo.
//
// ## O que este módulo nunca faz
//
// Imprimir a string de conexão, ou qualquer pedaço dela além do `project_ref`.
// O `ref` já está versionado em `.mcp.json` e em `INVENTARIO.md`; a senha do
// `postgres` não está em lugar nenhum e não vai passar por aqui. Por isso o
// reconhecimento é feito por expressão regular sobre a string crua, e não por
// `new URL()`: nada é desmontado em partes que possam vazar numa mensagem de
// erro.
//
// ## Uso
//
//   node scripts/banco-alvo.mjs --conferir
//       diz para onde `SUPABASE_DB_URL` aponta, sem tocar no banco.

import fs from "node:fs";
import path from "node:path";

export const ARQUIVO = path.join(process.cwd(), "diretrizes", "BANCO-ALVO.json");

/** O `project_ref` do Supabase: 20 letras minúsculas. */
export const PADRAO_DE_REF = /^[a-z]{20}$/;

export function alvoDeclarado() {
  if (!fs.existsSync(ARQUIVO)) {
    throw new Error(
      "diretrizes/BANCO-ALVO.json não existe. Sem declaração não há o que conferir,\n" +
        "e alvo não conferido é como se perderam dois dias em 11 e 12/08/2026."
    );
  }
  const alvo = JSON.parse(fs.readFileSync(ARQUIVO, "utf8"));
  if (!PADRAO_DE_REF.test(alvo.project_ref ?? "")) {
    throw new Error(`diretrizes/BANCO-ALVO.json: \`project_ref\` inválido — esperado 20 letras minúsculas.`);
  }
  return alvo;
}

/**
 * O `project_ref` que uma string de conexão alcança, ou `null`.
 *
 * Duas formas, porque o Supabase oferece as duas e elas escondem o `ref` em
 * lugares diferentes:
 *
 *   direta   postgres://postgres:SENHA@db.<ref>.supabase.co:5432/postgres
 *   pooler   postgres://postgres.<ref>:SENHA@aws-0-<região>.pooler.supabase.com:6543/postgres
 *
 * Ler só a primeira faria o portão passar por cima de toda execução via pooler,
 * devolvendo `null` — e `null` tratado como "não sei" vira "deixa passar" na
 * primeira vez que alguém tem pressa.
 */
export function refDaUrl(url) {
  if (!url) return null;
  const direta = /@db\.([a-z]{20})\.supabase\.(?:co|com)\b/.exec(url);
  if (direta) return direta[1];
  const pooler = /:\/\/postgres\.([a-z]{20})[:@]/.exec(url);
  if (pooler) return pooler[1];
  return null;
}

/** Onde a conexão chega, em texto que pode ser impresso e colado. */
export function descreverAlvo(url) {
  const ref = refDaUrl(url);
  if (!ref) return "projeto não reconhecido na string de conexão";
  const viaPooler = /:\/\/postgres\.[a-z]{20}[:@]/.test(url);
  return `${ref} (${viaPooler ? "pooler" : `db.${ref}.supabase.co`})`;
}

/**
 * Confere o alvo, ou explica por que recusou. Nunca abre conexão.
 *
 * Devolve `{ ref, esperado, canonico, local }`. Lança quando não confere — o
 * chamador imprime e sai, porque um `console.warn` aqui seria exatamente o
 * aviso que ninguém lê no meio de 121 linhas de saída de migration.
 */
export function exigirAlvoDeclarado(url, { origem = "SUPABASE_DB_URL" } = {}) {
  const canonico = alvoDeclarado();
  const declarado = (process.env.BANCO_ALVO ?? "").trim();
  const esperado = declarado || canonico.project_ref;

  if (esperado === "local") {
    if (refDaUrl(url)) {
      throw new Error(
        `BANCO_ALVO=local foi declarado, mas ${origem} aponta para um projeto Supabase real ` +
          `(${descreverAlvo(url)}).\nRecuso: o que foi declarado e o que está na mão são coisas diferentes.`
      );
    }
    return { ref: null, esperado, canonico, local: true };
  }

  if (!PADRAO_DE_REF.test(esperado)) {
    throw new Error(
      `BANCO_ALVO=\`${esperado}\` não é um project_ref (20 letras minúsculas) nem a palavra \`local\`.`
    );
  }

  const ref = refDaUrl(url);
  if (!ref) {
    throw new Error(
      `Não reconheci o projeto em ${origem}.\n` +
        `Esperado: \`${esperado}\`${declarado ? " (declarado em BANCO_ALVO)" : " (diretrizes/BANCO-ALVO.json)"}.\n` +
        "Use a conexão direta `db.<ref>.supabase.co` ou a do pooler `postgres.<ref>@…`.\n" +
        "Se o alvo é um Postgres local, declare `BANCO_ALVO=local` — de propósito, não por omissão."
    );
  }

  if (ref !== esperado) {
    throw new Error(
      `${origem} aponta para \`${ref}\` e o alvo declarado é \`${esperado}\`.\n` +
        `Nada foi enviado ao banco.\n\n` +
        (declarado
          ? "Você declarou `BANCO_ALVO` e a conexão não bate com o que declarou."
          : `A declaração canônica é \`${canonico.project_ref}\` (${canonico.nome_de_exibicao}), ` +
            `em diretrizes/BANCO-ALVO.json.\n` +
            "Se a intenção é outro projeto, mude a declaração em commit, com data e motivo — ou\n" +
            "declare `BANCO_ALVO=<ref>` nesta execução. Alvo se troca digitando, não por omissão.")
    );
  }

  return { ref, esperado, canonico, local: false };
}

/**
 * A guarda inversa: este script **não pode** falar com o banco da plataforma.
 *
 * Vale para os seis `run-*-db-tests.mjs`, que criam e derrubam um banco
 * descartável (`object_runtime_test`, `messaging_outbox_test`, …) no servidor
 * para onde `DATABASE_URL` aponta. Para eles, alcançar o banco da plataforma
 * não é "alvo errado": é `drop database` no lugar errado.
 *
 * A primeira versão do portão da T-79.5 acusou esses seis por não conferirem o
 * alvo declarado — e a acusação estava errada, porque o alvo certo deles é
 * justamente outro. A pergunta que vale para os dois lados é a mesma — *com
 * qual banco eu estou falando?* —, só a resposta esperada muda.
 */
export function recusarBancoDaPlataforma(url, { origem = "DATABASE_URL", oQueFaz = "cria e derruba banco descartável" } = {}) {
  const ref = refDaUrl(url);
  if (!ref) return null;
  const canonico = alvoDeclarado();
  console.error(
    `${origem} alcança o projeto Supabase \`${ref}\`` +
      (ref === canonico.project_ref ? ` — o banco da plataforma (${canonico.nome_de_exibicao}).` : ".") +
      `\nEste script ${oQueFaz} e recusa qualquer projeto Supabase.` +
      "\nAponte `DATABASE_URL` para um Postgres descartável."
  );
  process.exit(2);
}

/**
 * O que todo script que toca o banco chama na primeira linha útil: confere,
 * anuncia e segue — ou imprime e sai com 2, sem abrir conexão.
 */
export function anunciarAlvoOuSair(url, opcoes = {}) {
  try {
    const conferido = exigirAlvoDeclarado(url, opcoes);
    if (conferido.local) {
      console.log("Alvo: Postgres local, declarado em BANCO_ALVO=local.");
    } else if (conferido.ref === conferido.canonico.project_ref) {
      console.log(
        `Alvo conferido: \`${conferido.ref}\` (${conferido.canonico.nome_de_exibicao}), ` +
          `conforme diretrizes/BANCO-ALVO.json.`
      );
    } else {
      // O nome de exibição pertence ao projeto canônico e a mais nenhum. A
      // primeira versão desta mensagem imprimia `wyeoju… (supabase-crimson-
      // bridge)` — batizava o projeto desviado com o nome do certo, que é o
      // tipo de linha que se lê rápido e confirma o que não foi conferido.
      console.log(
        `Alvo conferido: \`${conferido.ref}\` — **não é o canônico**.\n` +
          `  canônico ....: \`${conferido.canonico.project_ref}\` (${conferido.canonico.nome_de_exibicao})\n` +
          `  desviado por : BANCO_ALVO, nesta execução`
      );
    }
    return conferido;
  } catch (erro) {
    console.error("Alvo do banco recusado.\n\n" + erro.message);
    process.exit(2);
  }
}

// --- linha de comando -------------------------------------------------------

const executadoDireto = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (executadoDireto) {
  const canonico = alvoDeclarado();
  console.log(
    `Declarado em diretrizes/BANCO-ALVO.json: \`${canonico.project_ref}\` ` +
      `(${canonico.nome_de_exibicao}), desde ${canonico.declarado_em}.`
  );
  const url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "";
  if (!url) {
    console.log("SUPABASE_DB_URL não está no ambiente — nada para conferir aqui.");
    process.exit(0);
  }
  console.log(`A string de conexão do ambiente alcança: ${descreverAlvo(url)}.`);
  anunciarAlvoOuSair(url);
}
