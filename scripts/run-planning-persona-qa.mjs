import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const previewInput = new URL(process.env.PREVIEW_URL ?? "");
const previewOrigin = previewInput.origin;
const shareToken = previewInput.searchParams.get("_vercel_share");
const outputDir = process.env.QA_OUTPUT_DIR || "artifacts/planning-persona";
const personaKey = "gestor_de_obras";
await mkdir(outputDir, { recursive: true });

const baseReport = {
  generatedAt: new Date().toISOString(),
  persona: personaKey,
  personaContract: {
    mission: "Integrar escopo, prazo, custo, qualidade, segurança, contrato e capacidade, decidindo exceções na alçada correta.",
    prohibited: [
      "ocultar desvio por rebaseline",
      "aceitar risco material sem registrar impacto",
      "liberar frente sem pré-condições"
    ]
  },
  previewOrigin,
  scenarios: []
};

function readCredentials() {
  if (!process.env.QA_PERSONAS_JSON) return null;
  try {
    const data = JSON.parse(process.env.QA_PERSONAS_JSON);
    const item = data[personaKey] ?? data.GESTOR_DE_OBRAS ?? data.gestorObras;
    if (item?.email && item?.password) return { email: item.email, password: item.password };
  } catch {
    return { invalid: true };
  }
  return null;
}

const credentials = readCredentials();
if (!credentials || credentials.invalid) {
  baseReport.status = "BLOCKED_EXTERNAL";
  baseReport.blocker = credentials?.invalid
    ? "QA_PERSONAS_JSON não é JSON válido."
    : "Credencial específica da persona gestor_de_obras não está disponível em QA_PERSONAS_JSON.";
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(baseReport, null, 2)}\n`);
  console.error(baseReport.blocker);
  process.exit(1);
}

async function unlock(page) {
  if (!shareToken) return;
  await page.goto(`${previewOrigin}/?_vercel_share=${encodeURIComponent(shareToken)}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000
  });
}

async function login(page) {
  await page.goto(`${previewOrigin}/login?redirect=${encodeURIComponent("/app/obras")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000
  });
  if (!page.url().includes("/login")) return;
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    page.getByRole("button", { name: "Entrar" }).click()
  ]);
  if (page.url().includes("/selecionar-organizacao")) {
    const organization = page.locator('form button[type="submit"]').first();
    if (await organization.count()) {
      await Promise.all([page.waitForLoadState("domcontentloaded"), organization.click()]);
    }
  }
  if (page.url().includes("/login")) throw new Error("O login não foi concluído para gestor_de_obras.");
}

async function selectScheduleRoute(page) {
  await page.goto(`${previewOrigin}/app/obras`, { waitUntil: "networkidle", timeout: 120_000 });
  const links = await page.locator('a[href^="/app/obras/"]').evaluateAll(items => items
    .map(item => item.getAttribute("href"))
    .filter(Boolean)
  );
  const explicitSchedule = links.find(href => /^\/app\/obras\/[^/]+\/cronograma(?:\?.*)?$/.test(href));
  if (explicitSchedule) return explicitSchedule.split("?")[0];
  const projectRoute = links.find(href => /^\/app\/obras\/[^/]+$/.test(href));
  if (projectRoute) return `${projectRoute}/cronograma`;
  return null;
}

async function inspectSmallTargets(scope) {
  return scope.locator("button,a,input,select,textarea").evaluateAll(elements => elements
    .filter(element => {
      if (!(element instanceof HTMLElement) || element.offsetParent === null) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    })
    .slice(0, 50)
    .map(element => {
      const rect = element.getBoundingClientRect();
      return {
        label: element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent?.trim().slice(0, 80) || "sem rótulo",
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    })
  );
}

const browser = await chromium.launch({ headless: true });
const viewports = [
  { name: "375px", width: 375, height: 812 },
  { name: "768px", width: 768, height: 1024 },
  { name: "1280px", width: 1280, height: 800 }
];
const themes = ["claro", "escuro"];

try {
  for (const viewport of viewports) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        colorScheme: theme === "escuro" ? "dark" : "light"
      });
      await context.addCookies([{ name: "innovar-tema", value: theme, url: previewOrigin }]);
      const page = await context.newPage();
      const consoleErrors = [];
      const consoleWarnings = [];
      const pageErrors = [];
      const serverErrors = [];
      page.on("console", message => {
        if (message.type() === "error") consoleErrors.push(message.text());
        if (message.type() === "warning") consoleWarnings.push(message.text());
      });
      page.on("pageerror", error => pageErrors.push(error.message));
      page.on("response", response => {
        if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
      });

      const findings = [];
      let scheduleRoute = null;
      let taskModalOpened = false;
      let dependencyTabOpened = false;
      try {
        await unlock(page);
        await login(page);
        scheduleRoute = await selectScheduleRoute(page);
        if (!scheduleRoute) {
          findings.push("[Obra indisponível] | Portfólio de Obras | bloqueante | A persona não possui obra acessível para validar o cronograma");
        } else {
          await page.goto(`${previewOrigin}${scheduleRoute}`, { waitUntil: "networkidle", timeout: 120_000 });
          await page.waitForTimeout(800);
          const finalPath = new URL(page.url()).pathname;
          if (finalPath !== scheduleRoute) {
            findings.push(`[Desvio de rota] | ${finalPath} | bloqueante | A persona não chegou ao cronograma selecionado`);
          }
          const heading = await page.getByRole("heading", { name: "Cronograma", exact: true }).count();
          const planner = await page.getByText("Planejamento da obra", { exact: true }).count();
          if (!heading || !planner) {
            findings.push("[Área principal ausente] | Cronograma | bloqueante | A persona não encontrou EAP e Gantt na mesma área");
          }

          const technicalText = await page.locator("body").innerText();
          if (/PGRST\d+|invalid input syntax|constraint|TypeError:|ReferenceError:|stack trace/i.test(technicalText)) {
            findings.push("[Mensagem técnica] | Cronograma | bloqueante | A persona recebeu detalhe interno");
          }

          const taskOpener = page.locator('button[title="Abrir informações da atividade"]').first();
          if (await taskOpener.count()) {
            await taskOpener.click();
            const dialog = page.getByRole("dialog").first();
            taskModalOpened = await dialog.isVisible().catch(() => false);
            if (taskModalOpened) {
              const dependencyTab = page.getByRole("button", { name: "Predecessoras e sucessoras" });
              if (await dependencyTab.count()) {
                await dependencyTab.click();
                dependencyTabOpened = true;
              }
            }
          } else {
            findings.push("[Sem atividade exercitável] | EAP | alta | A persona não pôde abrir informações de uma atividade real");
          }

          const smallTargets = await inspectSmallTargets(page.locator("body"));
          for (const target of smallTargets) {
            findings.push(`[Alvo abaixo de 44px] | ${target.label} | alta | Toque impreciso: ${target.width}x${target.height}px`);
          }
          const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
          if (bodyOverflow) findings.push("[Overflow global] | Cronograma | alta | A persona precisa rolar a página inteira lateralmente");
          if (!taskModalOpened && await taskOpener.count()) findings.push("[Modal não abriu] | Atividade | bloqueante | A persona não conseguiu editar o registro");
          if (taskModalOpened && !dependencyTabOpened) findings.push("[Aba indisponível] | Dependências | bloqueante | A persona não conseguiu revisar a rede lógica");
        }
      } catch (error) {
        findings.push(`[Falha de execução] | ${page.url()} | bloqueante | ${error instanceof Error ? error.message : String(error)}`);
      }

      if (consoleErrors.length) findings.push(`[Console] | sessão | alta | ${consoleErrors.length} erro(s)`);
      if (consoleWarnings.length) findings.push(`[Warning] | sessão | alta | ${consoleWarnings.length} warning(s)`);
      if (pageErrors.length) findings.push(`[Page error] | sessão | bloqueante | ${pageErrors.length} erro(s)`);
      if (serverErrors.length) findings.push(`[Servidor] | sessão | bloqueante | ${serverErrors.length} resposta(s) 5xx`);

      const screenshot = `${outputDir}/planejamento-${viewport.name}-${theme}.png`;
      await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled" }).catch(() => {});
      baseReport.scenarios.push({
        viewport: viewport.name,
        theme,
        scheduleRoute,
        finalUrl: page.url(),
        taskModalOpened,
        dependencyTabOpened,
        consoleErrors,
        consoleWarnings,
        pageErrors,
        serverErrors,
        findings,
        screenshot,
        status: findings.length ? "FAIL" : "PASS"
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

baseReport.status = baseReport.scenarios.every(item => item.status === "PASS") ? "PASS" : "FAIL";
await writeFile(`${outputDir}/report.json`, `${JSON.stringify(baseReport, null, 2)}\n`);
console.log(JSON.stringify({ status: baseReport.status, scenarios: baseReport.scenarios.length }, null, 2));
if (baseReport.status !== "PASS") process.exit(1);
