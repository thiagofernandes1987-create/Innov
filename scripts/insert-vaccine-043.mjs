import { readFile, writeFile } from "node:fs/promises";

const path = "diretrizes/VACINAS.md";
let content = await readFile(path, "utf8");
if (content.includes("| `VACINA-043` |")) {
  console.log("VACINA-043 já está no catálogo.");
  process.exit(0);
}

const row42 = "| `VACINA-042` | Falha de formulário apaga preenchimento, mistura dependências e pode deixar o autor sem acesso | vigente | `useActionState`, erros por campo, dependências separadas, membership e papel preservado |";
const row44 = "| `VACINA-044` | Rede lógica aceita relação cruzada, duplicada ou cíclica antes da persistência | parcial | escopo por obra/organização, validação de grafo e testes negativos; RPC transacional ainda pendente |";
const row43 = "| `VACINA-043` | Correção visual é encerrada sem captura do preview no mesmo contexto | vigente | captura publicada, comparação por viewport/tema/persona e gate no CI |";

const tableBlock = `${row42}\n${row44}\n\n> O identificador \`VACINA-043\` está reservado no PR #34 para o gate de captura visual do preview.`;
if (!content.includes(tableBlock)) throw new Error("Bloco das vacinas 042/044 não encontrado.");
content = content.replace(tableBlock, `${row42}\n${row43}\n${row44}`);

const file42 = "├── VACINA-042-FALHA-DE-FORMULARIO-NAO-APAGA-CONTEXTO.md";
const file44 = "└── VACINA-044-REDE-LOGICA-VALIDADA-ANTES-DA-GRAVACAO.md";
const filesBlock = `${file42}\n${file44}`;
if (!content.includes(filesBlock)) throw new Error("Bloco de arquivos 042/044 não encontrado.");
content = content.replace(
  filesBlock,
  `${file42}\n├── VACINA-043-CORRECAO-VISUAL-EXIGE-CAPTURA-DO-PREVIEW.md\n${file44}`
);

await writeFile(path, content);
console.log("VACINA-043 importada no catálogo canônico.");
