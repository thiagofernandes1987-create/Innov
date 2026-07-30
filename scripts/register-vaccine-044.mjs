import { readFile, writeFile } from "node:fs/promises";

const path = "diretrizes/VACINAS.md";
let content = await readFile(path, "utf8");
if (content.includes("| `VACINA-044` |")) {
  throw new Error("VACINA-044 já está registrada no catálogo.");
}

const row42 = "| `VACINA-042` | Falha de formulário apaga preenchimento, mistura dependências e pode deixar o autor sem acesso | vigente | `useActionState`, erros por campo, dependências separadas, membership e papel preservado |";
const row44 = "| `VACINA-044` | Rede lógica aceita relação cruzada, duplicada ou cíclica antes da persistência | parcial | escopo por obra/organização, validação de grafo e testes negativos; RPC transacional ainda pendente |";
if (!content.includes(row42)) throw new Error("Linha da VACINA-042 não encontrada.");
content = content.replace(
  row42,
  `${row42}\n${row44}\n\n> O identificador \`VACINA-043\` está reservado no PR #34 para o gate de captura visual do preview.`
);

const lastFile = "└── VACINA-042-FALHA-DE-FORMULARIO-NAO-APAGA-CONTEXTO.md";
if (!content.includes(lastFile)) throw new Error("Final do catálogo de arquivos não encontrado.");
content = content.replace(
  lastFile,
  "├── VACINA-042-FALHA-DE-FORMULARIO-NAO-APAGA-CONTEXTO.md\n└── VACINA-044-REDE-LOGICA-VALIDADA-ANTES-DA-GRAVACAO.md"
);

await writeFile(path, content);
console.log("VACINA-044 registrada no catálogo canônico.");
