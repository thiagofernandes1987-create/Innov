// Segredo consumido por workflow precisa de guarda contra o valor vazio.
//
// ## Por que existe
//
// O GitHub expande um segredo indefinido como **string vazia**, sem aviso, sem
// anotação no log, sem alterar a conclusão do passo. Quem lê o painel vê verde.
//
// Medido em 12/08/2026, no primeiro disparo real do `aplicar-migrations`
// (run `31651934504`):
//
//   env:
//     SUPABASE_DB_URL:
//
// O passo chamado *"Conferir para onde SUPABASE_DB_URL aponta"* **passou** —
// porque o script deixava passar quando não havia URL, e a ausência de URL era
// indistinguível de "rodando sem credencial de propósito". Duas execuções
// anteriores na `main` já tinham falhado por isso e ninguém soube dizer por quê.
//
// É a mesma família da VACINA-057 (validador confere o artefato e não o efeito)
// e da regra da prova por sabotagem: **portão que não distingue "está certo" de
// "não havia o que conferir" não mede nada.**
//
// ## O que ele confere
//
// Todo `secrets.X` consumido por um workflow tem, no mesmo arquivo, uma guarda
// que recusa o valor vazio — `test -n "$X"`, `[ -z "$X" ]`, uma condição
// `secrets.X != ''`, ou a passagem por um script que exige (`--exigir`).
//
// ## A dívida é datada, e só pode diminuir
//
// Seis workflows não tinham guarda quando este portão nasceu. Eles entram em
// `diretrizes/SEGREDOS-SEM-GUARDA-ACEITOS.json` com motivo e data — o mesmo
// padrão de `EXPORTS-MORTOS-ACEITOS.json` e `ASSERCOES-FRACAS-ACEITAS.json`.
// Aceitar em arquivo datado é diferente de esconder em regex: o número fica
// visível e o portão reprova quem aumentar.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const DIR = path.join(raiz, ".github", "workflows");
const DIVIDA = path.join(raiz, "diretrizes", "SEGREDOS-SEM-GUARDA-ACEITOS.json");

const aceitos = fs.existsSync(DIVIDA)
  ? new Set(JSON.parse(fs.readFileSync(DIVIDA, "utf8")).aceitos.map(a => `${a.workflow}:${a.segredo}`))
  : new Set();

/**
 * Guarda reconhecida. As quatro formas em uso no repositório, e mais nenhuma —
 * reconhecer "qualquer menção ao nome" faria o portão aprovar o próprio uso do
 * segredo, que é o defeito com outro nome.
 */
function temGuarda(texto, segredo) {
  const s = segredo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    new RegExp(`test\\s+-n\\s+"?\\$\\{?${s}\\b`).test(texto) ||
    new RegExp(`-z\\s+"?\\$\\{?${s}\\b`).test(texto) ||
    new RegExp(`secrets\\.${s}\\s*(?:!=|==)\\s*''`).test(texto) ||
    /--exigir/.test(texto)
  );
}

/**
 * A segunda forma de o workflow descartar o sinal, e ela mordeu no mesmo dia.
 *
 * Em bash, o status de um pipeline é o do **último** comando. `node script |
 * tee arquivo` devolve o status do `tee`, que é sempre 0 — então um script que
 * recusa com `exit 2` vira um passo verde.
 *
 * Medido em 12/08/2026, no run `31652604375`: o passo com `--exigir` recusou
 * corretamente o segredo vazio, e o `| tee` jogou a recusa fora. O portão
 * funcionou e o workflow apagou o resultado — a mesma família de "gravar o
 * sinal e não olhar para ele" que a VACINA-069 documenta pela entrada.
 */
function pipelinesSemPipefail(texto) {
  const linhas = texto.split("\n");
  const achados = [];
  linhas.forEach((linha, i) => {
    if (!/\|\s*tee\b/.test(linha)) return;
    const janela = linhas.slice(Math.max(0, i - 12), i).join("\n");
    if (!/set\s+-o\s+pipefail|set\s+-eo?\s*pipefail/.test(janela)) achados.push(i + 1);
  });
  return achados;
}

const problemas = [];
let workflowsConferidos = 0;
let segredosConferidos = 0;
let dividaUsada = 0;

let pipelinesConferidos = 0;

for (const arquivo of fs.readdirSync(DIR).filter(n => /\.ya?ml$/.test(n)).sort()) {
  const texto = fs.readFileSync(path.join(DIR, arquivo), "utf8");

  for (const linha of pipelinesSemPipefail(texto)) {
    problemas.push({
      onde: `.github/workflows/${arquivo}:${linha}`,
      o_que: "`| tee` sem `set -o pipefail` — o status do pipeline é o do `tee`, sempre 0, então a recusa do comando anterior é descartada e o passo passa verde"
    });
  }
  pipelinesConferidos += (texto.match(/\|\s*tee\b/g) ?? []).length;

  const usados = [...new Set([...texto.matchAll(/secrets\.([A-Z0-9_]+)/g)].map(m => m[1]))].sort();
  if (!usados.length) continue;
  workflowsConferidos += 1;
  for (const segredo of usados) {
    segredosConferidos += 1;
    if (temGuarda(texto, segredo)) continue;
    if (aceitos.has(`${arquivo}:${segredo}`)) {
      dividaUsada += 1;
      continue;
    }
    problemas.push({
      onde: `.github/workflows/${arquivo}`,
      o_que: `consome \`secrets.${segredo}\` sem recusar o valor vazio — o GitHub expande segredo indefinido como string vazia, em silêncio, e o passo passa verde`
    });
  }
}

// Dívida que deixou de existir tem de sair do arquivo: débito congelado depois
// de resolvido vira permissão silenciosa.
if (dividaUsada < aceitos.size) {
  problemas.push({
    onde: "diretrizes/SEGREDOS-SEM-GUARDA-ACEITOS.json",
    o_que: `tem ${aceitos.size} entrada(s) e só ${dividaUsada} ainda se aplicam — remova as resolvidas, senão o débito vira permissão`
  });
}

if (problemas.length) {
  console.error("Segredo de workflow consumido sem guarda contra o valor vazio:\n");
  for (const p of problemas) console.error(`  ${p.onde} — ${p.o_que}`);
  console.error(
    "\nAcrescente uma recusa explícita antes do uso — `test -n \"$SEGREDO\" || exit 1` — ou, se a\n" +
      "ausência for aceitável por enquanto, registre em diretrizes/SEGREDOS-SEM-GUARDA-ACEITOS.json\n" +
      "com motivo e data. Débito datado é diferente de defeito escondido: o número fica visível."
  );
  process.exit(1);
}

console.log(
  `Sinal de workflow conferido: ${segredosConferidos} uso(s) de segredo em ${workflowsConferidos} workflow(s), ` +
    `todos recusando o valor vazio ou em dívida datada (${dividaUsada}); ` +
    `${pipelinesConferidos} pipeline(s) com \`tee\`, todos preservando o código de saída.`
);
