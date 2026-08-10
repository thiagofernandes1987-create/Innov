// Mede a distribuição tecnológica da §33 do MAPA-TECNOLOGICO.md.
//
// Por que existe: a §33 estabelece faixas (TypeScript 60–70%, SQL 20–25%,
// Go 5–15%) sem dizer **de que**. E a unidade decide o resultado — este mesmo
// repositório fica **acima e abaixo** da faixa de SQL conforme se conte ou não
// o ledger de migrations:
//
//     com migrations:  TypeScript 57,8%  SQL 38,8%  Go 0,3%
//     sem migrations:  TypeScript 84,0%  SQL 11,1%  Go 0,4%
//
// Alvo sem unidade não é alvo: é um número que confirma qualquer tese, porque
// quem cita escolhe a contagem depois de saber o que quer concluir.
//
// A migration é **append-only**: uma escrita em 2026 permanece para sempre e
// nunca é refatorada. Contá-la faz o SQL crescer de forma monotônica contra o
// código de aplicação, até que qualquer plataforma estoure a faixa por
// acumulação de história, e não por decisão de arquitetura. Por isso a leitura
// canônica proposta é a de **código vivo** — sem o ledger.
//
// Este script NÃO é portão. A própria §33 diz que a distribuição "não deve ser
// usada como limite rígido"; ela serve para provocar a pergunta, nunca para
// respondê-la. Escolher linguagem para reequilibrar percentual é exatamente o
// "otimizar por intuição" que a §39 proíbe.
//
//     node scripts/medir-distribuicao.mjs

import { execSync } from "node:child_process";
import fs from "node:fs";

const EXTENSOES = {
  ".ts": "TypeScript", ".tsx": "TypeScript", ".mts": "TypeScript", ".cts": "TypeScript",
  ".sql": "SQL", ".py": "Python", ".go": "Go", ".rs": "Rust"
};

// Faixas da §33. Rust e Python não têm faixa: a §33 os declara "escopo
// especializado" e "escopo excepcional", sem percentual — e alvo que o
// documento não deu não se inventa aqui.
const FAIXAS = { TypeScript: [60, 70], SQL: [20, 25], Go: [5, 15] };

const arquivos = execSync("git ls-files", { maxBuffer: 1e9 }).toString().trim().split("\n");

function classificar(caminho) {
  // `.claude/skills` é conteúdo de terceiros e não é código da plataforma.
  if (caminho.startsWith(".claude/skills/")) return null;
  // `benchmarks/` é instrumento de medição, não plataforma. Contá-lo faria o
  // Go aparecer só porque alguém mediu o Go — o observador entrando na conta.
  if (caminho.startsWith("benchmarks/")) return null;
  const ext = caminho.slice(caminho.lastIndexOf("."));
  return EXTENSOES[ext] ?? null;
}

const linhasPorArquivo = new Map();
for (const caminho of arquivos) {
  if (!classificar(caminho)) continue;
  try {
    linhasPorArquivo.set(caminho, fs.readFileSync(caminho, "utf8").split("\n").length);
  } catch {
    // arquivo removido entre o ls-files e a leitura; ignorar
  }
}

function medir(incluirMigrations) {
  const total = {};
  for (const [caminho, linhas] of linhasPorArquivo) {
    if (!incluirMigrations && caminho.startsWith("supabase/migrations/")) continue;
    const lingua = classificar(caminho);
    total[lingua] = (total[lingua] ?? 0) + linhas;
  }
  const soma = Object.values(total).reduce((a, b) => a + b, 0);
  return { total, soma };
}

function imprimir(titulo, { total, soma }) {
  console.log(`\n--- ${titulo} — núcleo de ${soma.toLocaleString("pt-BR")} linhas`);
  for (const lingua of ["TypeScript", "SQL", "Go", "Python", "Rust"]) {
    const linhas = total[lingua] ?? 0;
    const pct = soma ? (linhas / soma) * 100 : 0;
    const faixa = FAIXAS[lingua];
    let situacao = "sem faixa na §33";
    if (faixa) {
      const [minimo, maximo] = faixa;
      situacao = pct < minimo ? `ABAIXO de ${minimo}%` : pct > maximo ? `ACIMA de ${maximo}%` : `dentro de ${minimo}–${maximo}%`;
    }
    console.log(
      `  ${lingua.padEnd(11)} ${pct.toFixed(1).padStart(5)}%  ` +
      `${linhas.toLocaleString("pt-BR").padStart(8)} linhas   ${situacao}`
    );
  }
}

console.log("Distribuição tecnológica — §33 do MAPA-TECNOLOGICO.md");
imprimir("código vivo (leitura canônica proposta, sem o ledger)", medir(false));
imprimir("com o ledger de migrations (append-only)", medir(true));

console.log(
  "\nA divergência entre as duas leituras é o ponto: enquanto a §33 não fixar a\n" +
  "unidade, ela comprova o que o leitor já queria concluir. Ver a reconciliação\n" +
  "no preâmbulo do MAPA-TECNOLOGICO.md."
);
