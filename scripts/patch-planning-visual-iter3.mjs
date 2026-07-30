import { readFile, writeFile } from "node:fs/promises";

const componentPath = "components/planejamento/schedule-planner.tsx";
const cssPath = "components/planejamento/schedule-planner.module.css";
const globalsPath = "app/globals.css";

let component = await readFile(componentPath, "utf8");
let css = await readFile(cssPath, "utf8");
let globals = await readFile(globalsPath, "utf8");

const taskButtonFrom = `                    <button className={styles.nameButton} type="button" onClick={() => openTaskEditor(row.task.id)} title="Abrir informações da atividade">\n                      {row.task.title}\n                    </button>`;
const taskButtonTo = `                    <button\n                      className={styles.nameButton}\n                      type="button"\n                      onClick={() => openTaskEditor(row.task.id)}\n                      title={\`${'${row.task.code}'} · ${'${row.task.title}'}\`}\n                      aria-label={\`Abrir atividade ${'${row.task.code}'} · ${'${row.task.title}'}\`}\n                    >\n                      {row.task.title}\n                    </button>`;
if (!component.includes(taskButtonFrom)) throw new Error("Botão do nome da atividade não encontrado.");
component = component.replace(taskButtonFrom, taskButtonTo);

const marker = "/* QA_PLANNING_ITER3_TEXT_ALIGNMENT */";
if (css.includes(marker)) throw new Error("Alinhamento da iteração 3 já aplicado.");
css += `\n\n${marker}\n.nameButton {\n  justify-content: flex-start;\n  text-align: left;\n}\n`;

const bodyBackgroundFrom = `  background:\n    radial-gradient(circle at 92% -10%, rgba(173, 107, 53, 0.10), transparent 28rem),\n    linear-gradient(180deg, #fbfaf7 0%, var(--page) 44%, #f4f6f7 100%);`;
const bodyBackgroundTo = `  background:\n    radial-gradient(circle at 92% -10%, color-mix(in srgb, var(--copper) 10%, transparent), transparent 28rem),\n    linear-gradient(\n      180deg,\n      color-mix(in srgb, var(--surface) 78%, var(--page)) 0%,\n      var(--page) 44%,\n      color-mix(in srgb, var(--surface-muted) 72%, var(--page)) 100%\n    );`;
if (!globals.includes(bodyBackgroundFrom)) throw new Error("Background global esperado não encontrado.");
globals = globals.replace(bodyBackgroundFrom, bodyBackgroundTo);

await writeFile(componentPath, component);
await writeFile(cssPath, css);
await writeFile(globalsPath, globals);
console.log("Terceira correção visual do Planejamento aplicada.");
