import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

for (const name of ["PREVIEW_URL", "MODULE_KEY", "MODULE_ROUTE", "QA_PERSONA"]) {
  if (!process.env[name]) throw new Error(`Variável obrigatória ausente: ${name}`);
}

const previewInput = new URL(process.env.PREVIEW_URL);
const previewUrl = previewInput.origin;
const vercelShareToken = previewInput.searchParams.get("_vercel_share") ?? process.env.VERCEL_SHARE_TOKEN ?? null;
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
const moduleKey = process.env.MODULE_KEY;
const moduleRoute = process.env.MODULE_ROUTE.startsWith("/") ? process.env.MODULE_ROUTE : `/${process.env.MODULE_ROUTE}`;
const persona = process.env.QA_PERSONA.trim().toLowerCase();
const expectedHeading = process.env.QA_EXPECTED_HEADING ? new RegExp(process.env.QA_EXPECTED_HEADING, "i") : null;
const outputRoot = process.env.QA_OUTPUT_DIR ?? path.join("artifacts", "module-visual-qa", moduleKey);
const extraHTTPHeaders = bypassSecret
  ? {
      "x-vercel-protection-bypass": bypassSecret,
      "x-vercel-set-bypass-cookie": "samesitenone"
    }
  : {};

function credentialsForPersona() {
  if (process.env.QA_PERSONAS_JSON) {
    let parsed;
    try {
      parsed = JSON.parse(process.env.QA_PERSONAS_JSON);
    } catch {
      throw new Error("QA_PERSONAS_JSON não é JSON válido.");
    }
    const item = parsed?.[persona] ?? parsed?.[persona.toUpperCase()] ?? parsed?.[process.env.QA_PERSONA];
    if (item?.email && item?.password) return item;
  }

  if (["super_admin", "administrador", "admin"].includes(persona) && process.env.DEMO_ADMIN_PASSWORD) {
    return {
      email: process.env.DEMO_ADMIN_EMAIL ?? "admin@innov.eng.br",
      password: process.env.DEMO_ADMIN_PASSWORD
    };
  }

  if (persona === "cliente" && process.env.DEMO_CLIENT_PASSWORD) {
    return {
      email: process.env.DEMO_CLIENT_EMAIL ?? "cliente@cliente.com",
      password: process.env.DEMO_CLIENT_PASSWORD
    };
  }

  throw new Error(`Credenciais ausentes para a persona ${persona}. Use QA_PERSONAS_JSON.`);
}

const viewports = [
  { name: "375px", width: 375, height: 812 },
  { name: "768px", width: 768, height: 1024 },
  { name: "1280px", width: 1280, height: 800 }
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

await fs.mkdir(outputRoot, { recursive: true });

let credentials;
try {
  credentials = credentialsForPersona();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const blockedReport = {
    moduleKey,
    route: moduleRoute,
    persona,
    previewUrl,
    generatedAt: new Date().toISOString(),
    scenarios: [
      {
        viewport: null,
        theme: null,
        screenshot: null,
        findings: [
          `[Credencial de persona ausente] | GitHub Actions | bloqueante | A persona ${persona} não pode executar o fluxo: ${message}`
        ],
        technicalStatus: "bloqueado",
        visualReview: "não_executada"
      }
    ]
  };
  await fs.writeFile(path.join(outputRoot, "report.json"), `${JSON.stringify(blockedReport, null, 2)}\n`, "utf8");
  throw error;
}

async function unlockPreview(page) {
  if (!vercelShareToken) return;
  await page.goto(`${previewUrl}/?_vercel_share=${encodeURIComponent(vercelShareToken)}`, {
    waitUntil: "domcontentloaded"
  });
}

async function login(page) {
  await page.goto(`${previewUrl}/login?redirect=${encodeURIComponent(moduleRoute)}`, {
    waitUntil: "domcontentloaded"
  });
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

  if (page.url().includes("/login")) {
    throw new Error(`Login não concluiu para a persona ${persona}.`);
  }
}

async function inspectTouchTargets(page) {
  return page.evaluate(() => {
    const selector = [
      "button",
      "[role='button']",
      "a.button",
      ".barra-superior a",
      ".barra-superior button",
      ".launcher-faixa a",
      ".launcher-faixa button",
      ".barra-de-trabalho a",
      ".barra-de-trabalho button"
    ].join(",");

    return [...document.querySelectorAll(selector)]
      .filter(element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      })
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          label:
            element.getAttribute("aria-label") ||
            element.getAttribute("title") ||
            element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
            "sem rótulo",
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      })
      .filter(item => item.width < 44 || item.height < 44);
  });
}

const browser = await chromium.launch({ headless: true });
const report = {
  moduleKey,
  route: moduleRoute,
  persona,
  authenticatedAs: credentials.email,
  previewUrl,
  previewProtected: Boolean(vercelShareToken || bypassSecret),
  generatedAt: new Date().toISOString(),
  scenarios: []
};

try {
  for (const viewport of viewports) {
    for (const theme of themes) {
      const findings = [];
      const consoleErrors = [];
      const consoleWarnings = [];
      const pageErrors = [];
      const failedResponses = [];
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: theme === "escuro" ? "dark" : "light",
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        extraHTTPHeaders
      });

      await context.addCookies([{ name: "innovar-tema", value: theme, url: previewUrl }]);
      const page = await context.newPage();
      page.on("console", message => {
        if (message.type() === "error") consoleErrors.push(message.text());
        if (message.type() === "warning") consoleWarnings.push(message.text());
      });
      page.on("pageerror", error => pageErrors.push(error.message));
      page.on("response", response => {
        if (response.status() >= 500) failedResponses.push(`${response.status()} ${response.url()}`);
      });

      try {
        await unlockPreview(page);
        await login(page);
        await page.goto(`${previewUrl}${moduleRoute}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(800);

        const finalPath = new URL(page.url()).pathname;
        if (finalPath.startsWith("/login") || finalPath.startsWith("/selecionar-organizacao") || finalPath.startsWith("/acesso-negado")) {
          findings.push(`[Rota incorreta] | ${finalPath} | bloqueante | A persona não entrou no módulo`);
        }
        const routeMatches = moduleRoute === "/app" ? finalPath === "/app" : finalPath.startsWith(moduleRoute);
        if (!routeMatches) {
          findings.push(`[Desvio de navegação] | ${finalPath} | alta | A persona foi levada para fora do fluxo ${moduleRoute}`);
        }

        const bodyText = await page.locator("body").innerText().catch(() => "");
        for (const pattern of technicalPatterns) {
          const match = bodyText.match(pattern);
          if (match) {
            findings.push(`[Mensagem técnica visível] | ${moduleRoute} | bloqueante | A persona recebeu detalhe interno: ${match[0]}`);
          }
        }

        if (expectedHeading) {
          const headings = await page.getByRole("heading").allTextContents();
          if (!headings.some(heading => expectedHeading.test(heading))) {
            findings.push(`[Título esperado ausente] | ${moduleRoute} | alta | A persona não confirma em qual módulo está`);
          }
        }

        const geometry = await page.evaluate(() => {
          const root = document.documentElement;
          const body = document.body;
          return {
            viewportWidth: root.clientWidth,
            documentWidth: Math.max(root.scrollWidth, body?.scrollWidth ?? 0),
            viewportHeight: root.clientHeight,
            documentHeight: Math.max(root.scrollHeight, body?.scrollHeight ?? 0),
            title: document.title
          };
        });

        if (geometry.documentWidth > geometry.viewportWidth + 2) {
          findings.push(`[Overflow horizontal global] | ${moduleRoute} | alta | A persona precisa rolar lateralmente: ${geometry.documentWidth}px > ${geometry.viewportWidth}px`);
        }

        const undersizedTargets = await inspectTouchTargets(page);
        for (const target of undersizedTargets) {
          findings.push(`[Alvo abaixo de 44px] | ${target.label} | alta | Toque impreciso para a persona: ${target.width}x${target.height}px`);
        }

        if (consoleErrors.length) findings.push(`[Console] | ${moduleRoute} | alta | ${consoleErrors.length} erro(s) durante o fluxo`);
        if (consoleWarnings.length) findings.push(`[Warning] | ${moduleRoute} | alta | ${consoleWarnings.length} warning(s) inesperado(s)`);
        if (pageErrors.length) findings.push(`[Page error] | ${moduleRoute} | bloqueante | ${pageErrors.length} erro(s) de página`);
        if (failedResponses.length) findings.push(`[Servidor] | ${moduleRoute} | bloqueante | ${failedResponses.length} resposta(s) 5xx`);

        const screenshotPath = path.join(outputRoot, `${moduleKey}-${viewport.name}-${theme}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });

        report.scenarios.push({
          viewport: viewport.name,
          theme,
          finalUrl: page.url(),
          screenshot: screenshotPath,
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
        findings.push(`[Falha de execução] | ${page.url()} | bloqueante | ${message}`);
        report.scenarios.push({
          viewport: viewport.name,
          theme,
          finalUrl: page.url(),
          screenshot: null,
          consoleErrors,
          consoleWarnings,
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
const failed = report.scenarios.some(scenario => scenario.technicalStatus === "reprovado");
console.log(JSON.stringify({ ok: !failed, moduleKey, scenarios: report.scenarios.length, outputRoot, reportPath }, null, 2));
if (failed) process.exit(1);
