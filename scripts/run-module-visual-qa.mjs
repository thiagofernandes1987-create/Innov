import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const required = ["PREVIEW_URL", "MODULE_KEY", "MODULE_ROUTE", "QA_PERSONA"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Variável obrigatória ausente: ${name}`);
}

const previewUrl = process.env.PREVIEW_URL.replace(/\/$/, "");
const moduleKey = process.env.MODULE_KEY;
const moduleRoute = process.env.MODULE_ROUTE.startsWith("/")
  ? process.env.MODULE_ROUTE
  : `/${process.env.MODULE_ROUTE}`;
const persona = process.env.QA_PERSONA;
const outputRoot = process.env.QA_OUTPUT_DIR ?? path.join("artifacts", "module-visual-qa", moduleKey);

function credentialsForPersona() {
  if (process.env.QA_PERSONAS_JSON) {
    let parsed;
    try {
      parsed = JSON.parse(process.env.QA_PERSONAS_JSON);
    } catch {
      throw new Error("QA_PERSONAS_JSON não é JSON válido.");
    }
    const item = parsed?.[persona];
    if (item?.email && item?.password) return item;
  }

  if (["super_admin", "administrador", "admin"].includes(persona)) {
    const email = process.env.DEMO_ADMIN_EMAIL ?? "admin@innov.eng.br";
    const password = process.env.DEMO_ADMIN_PASSWORD;
    if (password) return { email, password };
  }

  if (persona === "cliente") {
    const email = process.env.DEMO_CLIENT_EMAIL ?? "cliente@cliente.com";
    const password = process.env.DEMO_CLIENT_PASSWORD;
    if (password) return { email, password };
  }

  throw new Error(`Credenciais ausentes para a persona ${persona}. Use QA_PERSONAS_JSON.`);
}

const credentials = credentialsForPersona();
const viewports = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "390x844", width: 390, height: 844 }
];
const themes = ["claro", "escuro"];
const technicalPatterns = [
  /PGRST\d+/i,
  /invalid input syntax/i,
  /violates .* constraint/i,
  /duplicate key value/i,
  /stack trace/i,
  /this page couldn['’]t load/i,
  /server error occurred/i,
  /\bNaN\b/,
  /\bInfinity\b/,
  /TypeError:/i,
  /ReferenceError:/i
];

async function login(page) {
  const redirect = encodeURIComponent(moduleRoute);
  await page.goto(`${previewUrl}/login?redirect=${redirect}`, { waitUntil: "domcontentloaded" });

  if (!page.url().includes("/login")) return;

  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    page.getByRole("button", { name: "Entrar" }).click()
  ]);

  if (page.url().includes("/selecionar-organizacao")) {
    const organizationButton = page.locator('form button[type="submit"]').first();
    if (await organizationButton.count()) {
      await Promise.all([
        page.waitForLoadState("domcontentloaded"),
        organizationButton.click()
      ]);
    }
  }
}

await fs.mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = {
  module: moduleKey,
  route: moduleRoute,
  persona,
  previewUrl,
  generatedAt: new Date().toISOString(),
  scenarios: []
};

try {
  for (const viewport of viewports) {
    for (const theme of themes) {
      const findings = [];
      const consoleErrors = [];
      const pageErrors = [];
      const failedResponses = [];
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: theme === "escuro" ? "dark" : "light",
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo"
      });

      await context.addCookies([
        {
          name: "innovar-tema",
          value: theme,
          url: previewUrl
        }
      ]);

      const page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("response", (response) => {
        const status = response.status();
        if (status >= 500) failedResponses.push(`${status} ${response.url()}`);
      });

      try {
        await login(page);
        await page.goto(`${previewUrl}${moduleRoute}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(800);

        const bodyText = await page.locator("body").innerText().catch(() => "");
        for (const pattern of technicalPatterns) {
          const match = bodyText.match(pattern);
          if (match) findings.push(`[Mensagem técnica visível] ${match[0]} — severidade: bloqueante`);
        }

        const geometry = await page.evaluate(() => {
          const root = document.documentElement;
          const body = document.body;
          const active = document.activeElement;
          return {
            viewportWidth: root.clientWidth,
            documentWidth: Math.max(root.scrollWidth, body?.scrollWidth ?? 0),
            viewportHeight: root.clientHeight,
            documentHeight: Math.max(root.scrollHeight, body?.scrollHeight ?? 0),
            title: document.title,
            activeElement: active?.tagName ?? null
          };
        });

        if (geometry.documentWidth > geometry.viewportWidth + 2) {
          findings.push(`[Overflow horizontal global] ${geometry.documentWidth}px > ${geometry.viewportWidth}px — severidade: alta`);
        }
        if (consoleErrors.length) findings.push(`[Console] ${consoleErrors.length} erro(s) — severidade: alta`);
        if (pageErrors.length) findings.push(`[Page error] ${pageErrors.length} erro(s) — severidade: bloqueante`);
        if (failedResponses.length) findings.push(`[Servidor] ${failedResponses.length} resposta(s) 5xx — severidade: bloqueante`);

        const screenshotName = `${moduleKey}-${viewport.name}-${theme}.png`;
        const screenshotPath = path.join(outputRoot, screenshotName);
        await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });

        report.scenarios.push({
          viewport: viewport.name,
          theme,
          finalUrl: page.url(),
          screenshot: screenshotPath,
          geometry,
          consoleErrors,
          pageErrors,
          failedResponses,
          findings,
          technicalStatus: findings.length ? "reprovado" : "sem_achado_automatico",
          visualReview: "pendente"
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        findings.push(`[Falha de execução] ${message} — severidade: bloqueante`);
        report.scenarios.push({
          viewport: viewport.name,
          theme,
          finalUrl: page.url(),
          screenshot: null,
          consoleErrors,
          pageErrors,
          failedResponses,
          findings,
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

const failed = report.scenarios.some((scenario) => scenario.technicalStatus === "reprovado");
console.log(JSON.stringify({
  ok: !failed,
  module: moduleKey,
  scenarios: report.scenarios.length,
  outputRoot,
  reportPath
}, null, 2));

if (failed) process.exit(1);
