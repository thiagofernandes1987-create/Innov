// Harness de QA visual e funcional.
//
// Um comando por módulo: entra, navega, captura nos três breakpoints e nos dois
// temas, coleta console e devolve o texto da tela para a análise de persona.
//
// Roda contra a aplicação local no mesmo commit do preview — o navegador deste
// contêiner não atravessa o proxy para a Vercel (ERR_CONNECTION_RESET inclusive
// em example.com), então a verificação de deploy é feita pela API e a
// verificação visual aqui.

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { credencial } from "./credencial.mjs";

const BASE = process.env.QA_BASE || "http://localhost:3000";
const EXEC = process.env.QA_CHROMIUM || "/opt/pw-browsers/chromium";
const SAIDA = process.env.QA_OUT || path.join(process.cwd(), ".qa");

// Os três exigidos pelo protocolo do repositório (docs/qa/module-validation-status.json).
const VIEWPORTS = [
  { nome: "390x844", width: 390, height: 844, mobile: true },
  { nome: "1366x768", width: 1366, height: 768, mobile: false },
  { nome: "1920x1080", width: 1920, height: 1080, mobile: false }
];

async function entrar(ctx) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await p.fill('input[type="email"], input[name="email"]', credencial("QA_USER"));
  await p.fill('input[type="password"], input[name="password"]', credencial("QA_PASS"));
  await Promise.all([
    p.waitForURL(u => !u.pathname.startsWith("/login"), { timeout: 60000 }).catch(() => {}),
    p.click('button[type="submit"]')
  ]);
  await p.waitForLoadState("networkidle").catch(() => {});
  const ok = !p.url().includes("/login");
  const texto = await p.locator("body").innerText().catch(() => "");
  await p.close();
  return { ok, url: p.url(), texto: texto.slice(0, 400) };
}

async function medirAlvos(p) {
  // Área de toque mínima e transbordo horizontal — os dois critérios genéricos
  // que dá para medir sem julgamento estético.
  return p.evaluate(() => {
    const pequenos = [];
    const alvos = document.querySelectorAll('a,button,[role="button"],input,select,summary');
    // O que importa é o alvo EFETIVO: um título de 220x19 dentro de um cartão
    // clicável de 220x90 não é um alvo de 19px, é o cartão. Contar o filho
    // produzia reprovação em todo card do kanban e mandava aumentar o que já
    // era grande. Só conta quando não há ancestral clicável maior.
    function dentroDeAlvoMaior(el) {
      let n = el.parentElement;
      while (n && n !== document.body) {
        if (n.matches('a,button,[role="button"]')) {
          const b = n.getBoundingClientRect();
          if (b.height >= 44 && b.width >= 44) return true;
        }
        n = n.parentElement;
      }
      return false;
    }
    for (const el of alvos) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const est = getComputedStyle(el);
      if (est.visibility === "hidden" || est.display === "none") continue;
      if (dentroDeAlvoMaior(el)) continue;
      // Área EFETIVA, não o retângulo do elemento: quando um `::after` estende
      // a região clicável para todo o cartão, `getBoundingClientRect` continua
      // devolvendo a linha de texto. `elementFromPoint` é a verdade sobre o que
      // um toque acerta — sem isso o medidor manda aumentar o que já é grande.
      // Caixa de marcar dentro de rótulo: o alvo é o rótulo inteiro, porque
      // clicar no texto marca a caixa. Medir só o quadrado de 16px reprova o
      // que o dedo acerta — foi o que aconteceu com "Tempo real" do editor.
      const rotulo = el.closest("label") ||
        (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null);
      if (rotulo && (el.type === "checkbox" || el.type === "radio")) {
        const rr = rotulo.getBoundingClientRect();
        if (rr.height >= 44 && rr.width >= 44) continue;
      }
      const cx = r.x + r.width / 2;
      function estende(sinal) {
        let d = 0;
        for (let passo = 4; passo <= 60; passo += 4) {
          const y = sinal < 0 ? r.y - passo : r.bottom + passo;
          if (document.elementFromPoint(cx, y) !== el) break;
          d = passo;
        }
        return d;
      }
      // Sonda até 60px para cada lado. A primeira versão sondava só 12px fixos
      // e o cartão do kanban dava 19+24 = 43 — um pixel abaixo do limite, com
      // a área clicável real cobrindo os 91px do cartão. Sonda curta reprova o
      // que está certo.
      const alturaEfetiva = r.height + estende(-1) + estende(1);
      if (alturaEfetiva >= 44 && r.width >= 44) continue;
      if (r.height < 44 || r.width < 44) {
        pequenos.push({
          tag: el.tagName.toLowerCase(),
          txt: (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height)
        });
      }
    }
    const doc = document.documentElement;
    const transborda = doc.scrollWidth > doc.clientWidth + 1;
    const culpados = [];
    if (transborda) {
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.right > doc.clientWidth + 1 && r.width > 0) {
          culpados.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className || "").toString().slice(0, 60),
            right: Math.round(r.right)
          });
        }
        if (culpados.length >= 6) break;
      }
    }
    return {
      pequenos: pequenos.slice(0, 25),
      totalPequenos: pequenos.length,
      transborda,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      culpados
    };
  });
}

async function main() {
  const modulo = process.argv[2];
  const rota = process.argv[3];
  if (!modulo || !rota) {
    console.error("uso: node harness.js <modulo> <rota>");
    process.exit(2);
  }

  const dir = path.join(SAIDA, modulo);
  fs.mkdirSync(dir, { recursive: true });

  const b = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });

  const login = await entrar(ctx);
  if (!login.ok) {
    console.log(JSON.stringify({ modulo, erro: "login falhou", detalhe: login }, null, 2));
    await b.close();
    process.exit(1);
  }

  const relatorio = { modulo, rota, base: BASE, login: "ok", telas: [] };

  for (const vp of VIEWPORTS) {
    for (const tema of ["claro", "escuro"]) {
      const page = await ctx.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const console_ = [];
      page.on("console", m => {
        if (["error", "warning"].includes(m.type())) console_.push(`${m.type()}: ${m.text().slice(0, 200)}`);
      });
      page.on("pageerror", e => console_.push(`pageerror: ${e.message.slice(0, 200)}`));
      page.on("requestfailed", r => console_.push(`requestfailed: ${r.url().slice(0, 120)} ${r.failure()?.errorText || ""}`));

      await page.emulateMedia({ colorScheme: tema === "escuro" ? "dark" : "light" });
      let status = null;
      try {
        const r = await page.goto(`${BASE}${rota}`, { waitUntil: "networkidle", timeout: 60000 });
        status = r ? r.status() : null;
      } catch (e) {
        console_.push(`goto: ${e.message.slice(0, 160)}`);
      }
      await page.waitForTimeout(700);

      const arquivo = path.join(dir, `${modulo}-${vp.nome}-${tema}.png`);
      await page.screenshot({ path: arquivo, fullPage: true }).catch(() => {});

      const medidas = await medirAlvos(page).catch(() => null);
      const texto = await page.locator("body").innerText().catch(() => "");

      relatorio.telas.push({
        viewport: vp.nome,
        tema,
        status,
        arquivo,
        urlFinal: page.url(),
        medidas,
        console: console_,
        texto: texto.slice(0, 2500)
      });
      await page.close();
    }
  }

  fs.writeFileSync(path.join(dir, "relatorio.json"), JSON.stringify(relatorio, null, 2));
  // Resumo enxuto no stdout; o JSON completo fica no arquivo.
  for (const t of relatorio.telas) {
    const m = t.medidas || {};
    console.log(
      `${t.viewport} ${t.tema.padEnd(7)} status=${t.status} ` +
        `alvos<44px=${m.totalPequenos ?? "?"} transborda=${m.transborda ?? "?"}` +
        (m.transborda ? ` (${m.scrollWidth}>${m.clientWidth})` : "") +
        ` console=${t.console.length}`
    );
  }
  const primeiro = relatorio.telas.find(t => t.viewport === "1366x768" && t.tema === "claro");
  console.log("\n--- texto 1366 claro ---\n" + (primeiro ? primeiro.texto.slice(0, 1200) : "(vazio)"));
  const todosConsole = [...new Set(relatorio.telas.flatMap(t => t.console))];
  console.log("\n--- console (distinto) ---\n" + (todosConsole.length ? todosConsole.join("\n") : "nenhum"));

  await b.close();
}

main().catch(e => {
  console.error("ERRO", e.message);
  process.exit(1);
});
