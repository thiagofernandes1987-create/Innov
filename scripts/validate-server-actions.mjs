// Prevenção executável da VACINA-047-USE-SERVER-SO-EXPORTA-FUNCAO.md.
//
// Um arquivo marcado com `"use server"` só pode exportar **função assíncrona**.
// Toda exportação vira referência remota; uma constante não é chamável, e o que
// chega ao cliente é `undefined`.
//
// A vacina registrou, com todas as letras, que `pnpm typecheck` **não pega** —
// `export type` é apagado e `export const` compila sem reclamar. A falha só
// aparece em execução, e só do lado do cliente. Escrever isso na vacina não
// impediu que eu repetisse o erro no mesmo dia, num segundo arquivo: por isso a
// prevenção deixou de ser um parágrafo e virou este validador.
//
// O que ele reprova: qualquer `export` de um arquivo `"use server"` que não
// seja `export async function`. Reexportação de tipo (`export type`) passa,
// porque some na compilação.

import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const PASTAS = ["app", "lib", "components"];

function arquivos(dir) {
  const saida = [];
  if (!fs.existsSync(dir)) return saida;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const caminho = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === "node_modules" || item.name.startsWith(".")) continue;
      saida.push(...arquivos(caminho));
    } else if (/\.(ts|tsx)$/.test(item.name)) {
      saida.push(caminho);
    }
  }
  return saida;
}

const problemas = [];
let servidores = 0;

for (const caminho of PASTAS.flatMap(p => arquivos(path.join(raiz, p)))) {
  const fonte = fs.readFileSync(caminho, "utf8");
  // A diretiva vale só quando é a primeira instrução do arquivo.
  const primeiraLinhaUtil = fonte
    .split("\n")
    .map(l => l.trim())
    .find(l => l && !l.startsWith("//") && !l.startsWith("/*") && !l.startsWith("*"));
  if (primeiraLinhaUtil !== '"use server";' && primeiraLinhaUtil !== "'use server';") continue;
  servidores++;

  const relativo = path.relative(raiz, caminho);
  fonte.split("\n").forEach((linha, indice) => {
    const texto = linha.trim();
    if (!texto.startsWith("export")) return;
    if (texto.startsWith("export type") || texto.startsWith("export interface")) return;
    if (texto.startsWith("export async function")) return;
    problemas.push(`${relativo}:${indice + 1} — ${texto.slice(0, 90)}`);
  });
}

if (problemas.length > 0) {
  console.error(
    `Arquivo "use server" com exportação que não é função assíncrona (${problemas.length}):\n` +
      problemas.map(p => `- ${p}`).join("\n") +
      "\n\nVACINA-047: mova tipo e constante para um módulo puro e importe de lá.\n" +
      "O que chega ao cliente de um `export const` num arquivo \"use server\" é `undefined`,\n" +
      "e `pnpm typecheck` não reprova."
  );
  process.exit(1);
}

console.log(`Server actions validadas: ${servidores} arquivos "use server", todos exportando apenas função assíncrona.`);
