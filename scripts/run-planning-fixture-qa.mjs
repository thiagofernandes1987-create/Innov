import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { chromium } from "playwright";

const url = process.env.PREVIEW_URL;
if (!url) throw new Error("PREVIEW_URL é obrigatório.");

const outputDir = process.env.QA_OUTPUT_DIR || "artifacts/planning-fixture";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const scenarios = [];
const widths = [375, 768, 1280];
const themes = ["claro", "escuro"];

async function findSmallTargets(scope) {
  return scope.locator("button,a,input,select,textarea").evaluateAll(elements => elements
    .filter(element => {
      if (!(element instanceof HTMLElement) || element.offsetParent === null) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    })
    .slice(0, 100)
    .map(element => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName,
        text: element.textContent?.trim().slice(0, 80) || element.getAttribute("aria-label") || "",
        className: element.className,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    })
  );
}

for (const width of widths) {
  for (const theme of themes) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const consoleMessages = [];
    const pageErrors = [];
    const serverErrors = [];

    page.on("console", message => {
      if (message.type() === "error" || message.type() === "warning") {
        consoleMessages.push({ type: message.type(), text: message.text() });
      }
    });
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("response", response => {
      if (response.status() >= 500) serverErrors.push({ status: response.status(), url: response.url() });
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await page.evaluate(selectedTheme => {
      document.documentElement.dataset.tema = selectedTheme;
    }, theme);
    await page.waitForTimeout(500);

    const title = await page.getByRole("heading", { name: /Cronograma — Residencial Alphaville/ }).count();
    const planner = await page.getByText("Planejamento da obra", { exact: true }).count();
    const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    const clippedText = await page.evaluate(() => [...document.querySelectorAll("body *")]
      .filter(element => {
        if (!(element instanceof HTMLElement) || element.offsetParent === null) return false;
        const style = getComputedStyle(element);
        if (style.overflow === "visible" && style.textOverflow !== "ellipsis") return false;
        return element.scrollWidth > element.clientWidth + 1 && (element.textContent?.trim().length ?? 0) > 0;
      })
      .slice(0, 20)
      .map(element => ({ tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 100) }))
    );
    const baseSmallTargets = await findSmallTargets(page.locator("body"));
    const timelineVisibleWidth = await page.evaluate(() => {
      const viewport = document.querySelector('[class*="viewport"]');
      const timeline = document.querySelector('[class*="timelinePane"]');
      if (!(viewport instanceof HTMLElement) || !(timeline instanceof HTMLElement)) return 0;
      const viewportRect = viewport.getBoundingClientRect();
      const timelineRect = timeline.getBoundingClientRect();
      return Math.max(0, Math.min(viewportRect.right, timelineRect.right) - Math.max(viewportRect.left, timelineRect.left));
    });

    const baseName = `planning-${width}px-${theme}`;
    await page.screenshot({ path: `${outputDir}/${baseName}.png`, fullPage: true });

    const taskButton = page.getByRole("button", { name: "Forma e armadura" });
    let modalOpened = false;
    let dependencyTab = false;
    let generalModalSmallTargets = [];
    let dependencyModalSmallTargets = [];
    if (await taskButton.count()) {
      await taskButton.first().click();
      const dialog = page.getByRole("dialog", { name: /2.2 · Forma e armadura/ });
      modalOpened = await dialog.isVisible().catch(() => false);
      if (modalOpened) {
        generalModalSmallTargets = await findSmallTargets(dialog);
        await page.screenshot({ path: `${outputDir}/${baseName}-modal-geral.png`, fullPage: true });
        const tab = page.getByRole("button", { name: "Predecessoras e sucessoras" });
        if (await tab.count()) {
          await tab.click();
          dependencyTab = true;
          dependencyModalSmallTargets = await findSmallTargets(dialog);
          await page.screenshot({ path: `${outputDir}/${baseName}-modal-dependencias.png`, fullPage: true });
        }
      }
    }

    const minimumTimelineWidth = width <= 480 ? 80 : width <= 860 ? 240 : 360;
    const problems = [];
    if (!title || !planner) problems.push("A fixture ou o planejador não foi renderizado.");
    if (bodyOverflow) problems.push("A página possui overflow horizontal fora da área controlada do Gantt.");
    if (timelineVisibleWidth < minimumTimelineWidth) problems.push(`A faixa visível do Gantt tem apenas ${Math.round(timelineVisibleWidth)}px.`);
    if (consoleMessages.length) problems.push("Há erros ou warnings no console.");
    if (pageErrors.length) problems.push("Há page errors.");
    if (serverErrors.length) problems.push("Há respostas 5xx.");
    if (baseSmallTargets.length) problems.push("Há alvos interativos menores que 44px na área principal.");
    if (generalModalSmallTargets.length) problems.push("Há alvos interativos menores que 44px na aba Geral.");
    if (dependencyModalSmallTargets.length) problems.push("Há alvos interativos menores que 44px na aba de dependências.");
    if (!modalOpened) problems.push("O modal da atividade não abriu.");
    if (!dependencyTab) problems.push("A aba de dependências não pôde ser aberta.");

    scenarios.push({
      width,
      theme,
      title: Boolean(title),
      planner: Boolean(planner),
      bodyOverflow,
      timelineVisibleWidth: Math.round(timelineVisibleWidth),
      clippedText,
      baseSmallTargets,
      generalModalSmallTargets,
      dependencyModalSmallTargets,
      consoleMessages,
      pageErrors,
      serverErrors,
      modalOpened,
      dependencyTab,
      problems,
      status: problems.length ? "FAIL" : "PASS"
    });

    await page.close();
  }
}

await browser.close();
const report = {
  generatedAt: new Date().toISOString(),
  url,
  status: scenarios.every(scenario => scenario.status === "PASS") ? "PASS" : "FAIL",
  scenarios
};
await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
