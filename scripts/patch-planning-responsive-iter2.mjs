import { readFile, writeFile } from "node:fs/promises";

const componentPath = "components/planejamento/schedule-planner.tsx";
const cssPath = "components/planejamento/schedule-planner.module.css";

let component = await readFile(componentPath, "utf8");
let css = await readFile(cssPath, "utf8");

if (!component.includes("const ROW_HEIGHT = 42;")) {
  throw new Error("ROW_HEIGHT esperado não foi encontrado.");
}
component = component.replace("const ROW_HEIGHT = 42;", "const ROW_HEIGHT = 44;");

if (!css.includes("--row-height: 42px;")) {
  throw new Error("Token --row-height esperado não foi encontrado.");
}
css = css.replace("--row-height: 42px;", "--row-height: 44px;");

const marker = "/* QA_PLANNING_ITER2_RESPONSIVE */";
if (css.includes(marker)) throw new Error("Overrides responsivos já foram aplicados.");

css += `\n\n${marker}\n/* O editor mantém dimensões operacionais; no tablet/mobile as colunas auxiliares\n   ficam disponíveis no modal e o Gantt preserva uma faixa útil com rolagem interna. */\n.toolButton,\n.zoomButton,\n.primaryButton,\n.iconButton,\n.tab,\n.secondaryButton,\n.dangerButton {\n  min-height: 44px;\n}\n\n.iconButton,\n.zoomButton {\n  width: 44px;\n  min-width: 44px;\n}\n\n.collapseButton {\n  width: 44px;\n  min-width: 44px;\n  height: 44px;\n}\n\n.field input,\n.field select,\n.field textarea,\n.fullField input,\n.fullField select,\n.fullField textarea {\n  min-height: 44px;\n}\n\n.relationRow {\n  min-height: 44px;\n}\n\n.viewport {\n  overflow: auto;\n  scrollbar-gutter: stable;\n}\n\n.legend {\n  flex-wrap: wrap;\n}\n\n@media (max-width: 860px) {\n  .planner {\n    --left-pane: clamp(220px, 44vw, 340px);\n  }\n\n  .viewport {\n    grid-template-columns: var(--left-pane) minmax(520px, 1fr);\n  }\n\n  .leftHeader,\n  .leftRow {\n    grid-template-columns: 64px minmax(0, 1fr);\n  }\n\n  .leftHeader > :nth-child(n + 3),\n  .leftRow > :nth-child(n + 3) {\n    display: none;\n  }\n\n  .toolbar {\n    flex-wrap: wrap;\n  }\n\n  .toolbarGroup,\n  .toolbarActions {\n    width: 100%;\n  }\n\n  .toolbarActions {\n    justify-content: flex-start;\n  }\n}\n\n@media (max-width: 480px) {\n  .planner {\n    --left-pane: 220px;\n  }\n\n  .toolbarGroup,\n  .toolbarActions {\n    gap: 6px;\n  }\n\n  .toolbarTitle {\n    width: 100%;\n    margin-right: 0;\n  }\n\n  .toolButton,\n  .primaryButton {\n    padding-inline: 10px;\n  }\n\n  .legend {\n    gap: 8px 12px;\n    font-size: 0.68rem;\n  }\n}\n`;

await writeFile(componentPath, component);
await writeFile(cssPath, css);
console.log("Ajustes responsivos da iteração 2 aplicados.");
