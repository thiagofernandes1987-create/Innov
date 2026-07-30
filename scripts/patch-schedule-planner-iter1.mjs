import { readFile, writeFile } from "node:fs/promises";

const path = "components/planejamento/schedule-planner.tsx";
let source = await readFile(path, "utf8");
const original = source;

function replaceExact(from, to, label) {
  if (!source.includes(from)) throw new Error(`Trecho não encontrado: ${label}`);
  source = source.replace(from, to);
}

replaceExact(
`  useEffect(() => {\n    setEditorTab("general");\n  }, [editorTaskId]);\n\n`,
"",
"effect que redefine a aba"
);

replaceExact(
`  function predecessorLabel(taskId: string): string {`,
`  function openTaskEditor(taskId: string): void {\n    setEditorTab("general");\n    setEditorTaskId(taskId);\n  }\n\n  function predecessorLabel(taskId: string): string {`,
"função predecessorLabel"
);

const editorCalls = source.match(/setEditorTaskId\(row\.task\.id\)/g)?.length ?? 0;
if (editorCalls !== 2) throw new Error(`Esperadas 2 aberturas do editor; encontradas ${editorCalls}.`);
source = source.replaceAll("setEditorTaskId(row.task.id)", "openTaskEditor(row.task.id)");

replaceExact(
`title="Destacar a cadeia que determina a entrega"`,
`title="Destacar a cadeia determinante da entrega"`,
"título da cadeia"
);
replaceExact(
`<LinkSimple size={16} /> Cadeia crítica`,
`<LinkSimple size={16} /> Cadeia determinante`,
"rótulo da cadeia"
);

const durationSteps = source.match(/step="0\.5" name="durationDays"/g)?.length ?? 0;
if (durationSteps !== 2) throw new Error(`Esperados 2 campos de duração fracionária; encontrados ${durationSteps}.`);
source = source.replaceAll('min="0" step="0.5" name="durationDays"', 'min="1" step="1" name="durationDays"');

const lagSteps = source.match(/step="0\.5" name="lagDays"/g)?.length ?? 0;
if (lagSteps !== 2) throw new Error(`Esperados 2 campos de defasagem fracionária; encontrados ${lagSteps}.`);
source = source.replaceAll('step="0.5" name="lagDays"', 'step="1" name="lagDays"');

if (source === original) throw new Error("Nenhuma alteração foi aplicada.");
await writeFile(path, source);
console.log("SchedulePlanner corrigido para a iteração 1.");
