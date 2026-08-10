// Asserção fraca é teste que passa sem testar.
//
// Este validador nasceu de dois defeitos meus, no mesmo módulo, no mesmo dia.
// O leitor de PDF devolvia **730 pedaços e 24.924 caracteres** quando o arquivo
// tem cerca de 1.800 — ruído binário de um fluxo de imagem, misturado ao texto
// da publicação. E lia cada fluxo duas vezes, porque `endstream` contém
// `stream`. Os dois passaram por todos os testes.
//
// Passaram porque o teste dizia:
//
//     expect(lido.texto).toContain("R8-N");
//
// e o texto continha "R8-N" — junto com 23.000 caracteres de lixo. `toContain`
// é satisfeito por uma agulha; ele não tem opinião sobre o palheiro.
//
// A régua deste validador é a mesma do `validate:exports-mortos`: o que já
// existe entra como dívida datada em `ASSERCOES-FRACAS-ACEITAS.json`, e a
// contagem **não pode crescer**. Bloquear as antigas de uma vez pararia o
// repositório; deixá-las sem teto deixaria o problema crescer em silêncio.
//
// Não é proibição de `toContain`. Há uso legítimo — conferir que uma mensagem
// de erro menciona o campo certo, por exemplo. O que o teto impede é a asserção
// fraca virar o padrão do arquivo novo.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const TESTES = path.join(raiz, "tests");
const TETO = path.join(raiz, "diretrizes", "ASSERCOES-FRACAS-ACEITAS.json");

/** Asserções que passam sem constranger o resultado inteiro. */
const FRACAS = [
  "toContain", "toBeTruthy", "toBeDefined", "toBeGreaterThan",
  "toBeGreaterThanOrEqual", "toBeLessThan", "toBeLessThanOrEqual"
];

function arquivos(dir) {
  const saida = [];
  if (!fs.existsSync(dir)) return saida;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) saida.push(...arquivos(completo));
    else if (/\.test\.tsx?$/.test(entrada.name)) saida.push(completo);
  }
  return saida;
}

const porArquivo = new Map();
let total = 0;
for (const arquivo of arquivos(TESTES)) {
  const fonte = fs.readFileSync(arquivo, "utf8");
  let contagem = 0;
  for (const fraca of FRACAS) {
    // `.not.` antes do matcher NÃO conta, e a distinção é a tese deste portão,
    // não uma exceção conveniente.
    //
    // O defeito que ele persegue é a agulha encontrada com o palheiro ignorado:
    // `expect(texto).toContain("R8-N")` passava com 23.000 caracteres de lixo ao
    // lado. A **negação** é o caso oposto — `expect(JSON.stringify(evento))
    // .not.toContain(SEGREDO)` só passa se o segredo não estiver em **nenhum**
    // campo do objeto inteiro. Ela varre o palheiro por definição; é a forma
    // exaustiva, e é como se testa que um dado sensível não vazou.
    //
    // Contá-la como fraca inflava o número com exatamente as asserções que a
    // diretriz pede que existam, e criava o incentivo errado: apagar uma
    // conferência de vazamento baixaria o "débito".
    contagem += (fonte.match(new RegExp(`(?<!\\.not)\\.${fraca}\\(`, "g")) ?? []).length;
  }
  if (contagem > 0) {
    porArquivo.set(path.relative(raiz, arquivo), contagem);
    total += contagem;
  }
}

if (!fs.existsSync(TETO)) {
  console.error(
    `Teto de asserções fracas ausente: ${path.relative(raiz, TETO)}\n` +
    `Contadas agora: ${total}. Gere o inventário inicial antes de ligar o portão.`
  );
  process.exit(1);
}

const teto = JSON.parse(fs.readFileSync(TETO, "utf8"));
const limite = Number(teto.teto ?? 0);
const anterior = teto.por_arquivo ?? {};

const erros = [];
if (total > limite) {
  erros.push(`Asserções fracas subiram de ${limite} para ${total}.`);
  for (const [arquivo, agora] of [...porArquivo.entries()].sort()) {
    const antes = Number(anterior[arquivo] ?? 0);
    if (agora > antes) erros.push(`  ${arquivo}: ${antes} -> ${agora}`);
  }
}

if (erros.length) {
  console.error("Política de asserção reprovada:");
  for (const linha of erros) console.error(linha);
  console.error(
    "\n`toContain` e companhia passam com uma agulha e não olham o palheiro. " +
    "Prefira `toEqual` sobre o resultado inteiro, ou uma contagem exata. " +
    "Se a asserção fraca for mesmo a certa, atualize o teto com justificativa."
  );
  process.exit(1);
}

console.log(
  `Asserções conferidas: ${total} fraca(s) em ${porArquivo.size} arquivo(s), ` +
  `teto ${limite}, sem crescimento.`
);
