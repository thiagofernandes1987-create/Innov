import { readFile, writeFile } from "node:fs/promises";

const componentPath = "components/planejamento/schedule-planner.tsx";
const cssPath = "components/planejamento/schedule-planner.module.css";
let component = await readFile(componentPath, "utf8");
let css = await readFile(cssPath, "utf8");

const calculationFrom = `                    const delayed = end < toDay(today) && row.task.progress < 1;\n                    return (`;
const calculationTo = `                    const delayed = end < toDay(today) && row.task.progress < 1;\n                    const visualWidth = (end - start + 1) * dayWidth;\n                    const hitWidth = Math.max(44, visualWidth);\n                    const hitOffset = (hitWidth - visualWidth) / 2;\n                    const progressWidth = Math.round(visualWidth * row.task.progress);\n                    return (`;
if (!component.includes(calculationFrom)) throw new Error("Cálculo da barra não encontrado.");
component = component.replace(calculationFrom, calculationTo);

const styleFrom = `                          style={{ left: (start - range.start) * dayWidth, width: (end - start + 1) * dayWidth }}\n`;
const styleTo = `                          style={{\n                            left: (start - range.start) * dayWidth - hitOffset,\n                            width: hitWidth,\n                            "--bar-offset": \`${'${hitOffset}'}px\`,\n                            "--bar-visual-width": \`${'${visualWidth}'}px\`\n                          } as CSSProperties}\n`;
if (!component.includes(styleFrom)) throw new Error("Estilo da barra não encontrado.");
component = component.replace(styleFrom, styleTo);

const progressFrom = `                          <span className={styles.progressFill} style={{ width: \`${'${Math.round(row.task.progress * 100)}'}%\` }} />`;
const progressTo = `                          <span className={styles.progressFill} style={{ width: progressWidth }} />`;
if (!component.includes(progressFrom)) throw new Error("Progresso da barra não encontrado.");
component = component.replace(progressFrom, progressTo);

const marker = "/* QA_PLANNING_ITER2_HIT_AREA */";
if (css.includes(marker)) throw new Error("Áreas de interação já foram aplicadas.");
css += `\n\n${marker}\n.nameButton {\n  min-height: 44px;\n  display: flex;\n  align-items: center;\n}\n\n.dangerButton {\n  min-width: 44px;\n}\n\n.taskBar {\n  --bar-color: var(--brand);\n  top: 0;\n  height: 44px;\n  min-width: 44px;\n  background: transparent;\n  box-shadow: none;\n  overflow: visible;\n}\n\n.taskBar::before {\n  content: "";\n  position: absolute;\n  top: 10px;\n  left: var(--bar-offset, 0);\n  width: var(--bar-visual-width, 100%);\n  height: 24px;\n  border-radius: 5px;\n  background: var(--bar-color);\n  box-shadow: var(--shadow-xs);\n}\n\n.taskBar.critical {\n  --bar-color: var(--danger);\n  background: transparent;\n}\n\n.taskBar.delayed {\n  outline: 0;\n}\n\n.taskBar.delayed::before {\n  box-shadow: 0 0 0 2px var(--danger), var(--shadow-xs);\n}\n\n.taskBar.derived {\n  background-image: none;\n}\n\n.taskBar.derived::before {\n  background-color: var(--bar-color);\n  background-image: repeating-linear-gradient(45deg, rgba(255,255,255,.16) 0 5px, transparent 5px 10px);\n}\n\n.progressFill {\n  top: 10px;\n  bottom: auto;\n  left: var(--bar-offset, 0);\n  height: 24px;\n  border-radius: 5px 0 0 5px;\n  z-index: 1;\n}\n\n.barLabel {\n  height: 44px;\n  padding: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 2;\n}\n`;

await writeFile(componentPath, component);
await writeFile(cssPath, css);
console.log("Áreas de interação da iteração 2 aplicadas.");
