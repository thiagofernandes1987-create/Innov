import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

if (!process.env.PREVIEW_URL) throw new Error("PREVIEW_URL é obrigatória.");

const sharedUrl = new URL(process.env.PREVIEW_URL);
const origin = sharedUrl.origin;
const route = sharedUrl.pathname;
const outputRoot = process.env.QA_OUTPUT_DIR ?? path.join("artifacts", "public-launcher-fixture");
const viewports = [
  { name: "375px", width: 375, height: 812 },
  { name: "768px", width: 768, height: 1024 },
  { name: "1280px", width: 1280, height: 800 }
];
const themes = ["claro", "escuro"];

await fs.mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = {
  module: "dashboard",
  surface: "public_fixture",
  route,
  previewUrl: origin,
  generatedAt: new Date().toISOString(),
  approvalScope: "visual_partial_only",
  scenarios: []
};

try {
  for (const viewport of viewports) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: theme === "escuro" ? "dark" : "light",
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo"
      });
      await context.addCookies([{ name: "innovar-tema", value: theme, url: origin }]);
      const page = await context.newPage();
      const consoleErrors = [];
      const consoleWarnings = [];
      const pageErrors = [];
      const failedResponses = [];
      const findings = [];

      page.on("console", message => {
        if (message.type() === "error") consoleErrors.push(message.text());
        if (message.type() === "warning") consoleWarnings.push(message.text());
      });
      page.on("pageerror", error => pageErrors.push(error.message));
      page.on("response", response => {
        if (response.status() >= 500) failedResponses.push(`${response.status()} ${response.url()}`);
      });

      try {
        await page.goto(sharedUrl.toString(), { waitUntil: "networkidle" });
        await page.waitForTimeout(700);

        const headings = await page.getByRole("heading").allTextContents();
        if (!headings.some(heading => /Aplicativos/i.test(heading))) {
          findings.push("[Título esperado ausente] | launcher | alta | O usuário não identifica a superfície de aplicativos");
        }

        const geometry = await page.evaluate(() => ({
          viewportWidth: document.documentElement.clientWidth,
          documentWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0),
          viewportHeight: document.documentElement.clientHeight,
          documentHeight: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0)
        }));
        if (geometry.documentWidth > geometry.viewportWidth + 2) {
          findings.push(`[Overflow horizontal global] | launcher | alta | O usuário precisa rolar lateralmente: ${geometry.documentWidth}px > ${geometry.viewportWidth}px`);
        }

        const undersizedTargets = await page.evaluate(() => [...document.querySelectorAll("button,a,[role='button']")]
          .filter(element => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
          })
          .map(element => {
            const rect = element.getBoundingClientRect();
            return {
              label: element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) || "sem rótulo",
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            };
          })
          .filter(item => item.width < 44 || item.height < 44));

        for (const target of undersizedTargets) {
          findings.push(`[Alvo abaixo de 44px] | ${target.label} | alta | Toque impreciso: ${target.width}x${target.height}px`);
        }
        if (consoleErrors.length) findings.push(`[Console] | launcher | alta | ${consoleErrors.length} erro(s)`);
        if (consoleWarnings.length) findings.push(`[Warning] | launcher | alta | ${consoleWarnings.length} warning(s) inesperado(s)`);
        if (pageErrors.length) findings.push(`[Page error] | launcher | bloqueante | ${pageErrors.length} erro(s)`);
        if (failedResponses.length) findings.push(`[Servidor] | launcher | bloqueante | ${failedResponses.length} resposta(s) 5xx`);

        const screenshotPath = path.join(outputRoot, `launcher-${viewport.name}-${theme}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });

        report.scenarios.push({
          viewport: viewport.name,
          theme,
          screenshot: screenshotPath,
          finalUrl: page.url(),
          geometry,
          undersizedTargets,
          consoleErrors,
          consoleWarnings,
          pageErrors,
          failedResponses,
          findings,
          technicalStatus: findings.length ? "reprovado" : "sem_achado_automatico",
          visualReview: "pendente"
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        report.scenarios.push({
          viewport: viewport.name,
          theme,
          screenshot: null,
          finalUrl: page.url(),
          findings: [`[Falha de execução] | launcher | bloqueante | ${message}`],
          technicalStatus: "reprovado",
          visualReview: "não_executada"
        });
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

const reportPath = path.join(outputRoot, "report.json");
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
const failed = report.scenarios.some(scenario => scenario.technicalStatus === "reprovado");
console.log(JSON.stringify({ ok: !failed, reportPath, scenarios: report.scenarios.length }, null, 2));
if (failed) process.exit(1);
