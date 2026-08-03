// Auditoria de contraste WCAG AA, nos dois temas.
//
// Histórico do instrumento — as duas versões erradas ficam registradas porque
// cada uma falhou de um jeito diferente e as duas davam confiança indevida:
//
//   v1: seletor sem `b`. Escondeu o pior defeito da tela inicial — um `<b>`
//       branco sobre card claro, o valor do indicador, ilegível em 20 cards.
//       Ponto cego de ferramenta produz aprovação falsa.
//   v2: descartava o elemento assim que QUALQUER ancestral tinha
//       `background-image`. Como a casca inteira tem gradiente de página, 124
//       de 132 elementos saíam da conta. Aprovação falsa de novo, agora por
//       excesso de zelo.
//
//   v3 (esta): quando o fundo é gradiente, os pontos de cor são lidos do
//       próprio `background-image` computado e o contraste é avaliado contra
//       **o pior** deles. Só descarta quando não há cor nenhuma para ler, e
//       nesse caso conta e informa quantos foram.

import { chromium } from "playwright";
import { credencial } from "./credencial.mjs";
import { FONTE } from "./cor.mjs";

const BASE = process.env.QA_BASE || "http://localhost:3000";
const EXEC = process.env.QA_CHROMIUM || "/opt/pw-browsers/chromium";

const SELETOR = [
  "button", "a", "p", "span", "small", "b", "strong", "em", "i", "li",
  "td", "th", "label", "legend", "summary", "figcaption", "dt", "dd",
  "h1", "h2", "h3", "h4", "h5", "h6", "div", "option"
].join(",");

// O corpo abaixo vai ao navegador com o prelúdio de `cor.mjs` colado na frente.
// A aritmética de cor mora lá porque função serializada para o Chromium não é
// importável — e o que não é importável não tem teste. Quatro versões erradas
// deste medidor entraram assim, e nenhuma foi encontrada por teste.
const CORPO_DA_AUDITORIA = String(function auditar(sel) {
  // Todas as cores declaradas dentro de um background-image (gradientes).
  function coresDoGradiente(bgImage) {
    const achados = bgImage.match(/(?:rgba?|color)\([^)]+\)/g) || [];
    return achados.filter(c => alfa(c) >= 0.6);
  }

  // Devolve a lista de fundos candidatos. Mais de um quando há gradiente.
  function fundos(el) {
    // Começa no PRÓPRIO elemento: um botão com gradiente próprio era medido
    // contra o pai, e o chip selecionado — branco sobre azul — aparecia como
    // 1,08:1. Terceiro erro do instrumento, mesma família dos dois anteriores.
    let n = el;
    while (n) {
      const c = getComputedStyle(n);
      if (c.backgroundImage && c.backgroundImage !== "none") {
        const cores = coresDoGradiente(c.backgroundImage);
        if (cores.length > 0) return cores;
        // Gradiente sem cor legível (imagem, url()): cai para a cor de fundo.
      }
      const bg = c.backgroundColor;
      if (bg && !/rgba\(0, 0, 0, 0\)|transparent|color\([a-z0-9-]+ 0 0 0 \/ 0\)/.test(bg) && alfa(bg) >= 0.6) return [bg];
      n = n.parentElement;
    }
    return ["rgb(255, 255, 255)"];
  }

  const falhas = [];
  let medidos = 0, semFundo = 0;
  for (const el of document.querySelectorAll(sel)) {
    if (el.children.length > 0) continue;
    const txt = (el.textContent || "").trim();
    if (txt.length < 2) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;

    const cands = fundos(el);
    if (cands.length === 0) { semFundo++; continue; }
    medidos++;

    const L1 = lum(num(cs.color));
    let pior = Infinity, piorFundo = null;
    for (const f of cands) {
      const L2 = lum(num(f));
      const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (cr < pior) { pior = cr; piorFundo = f; }
    }
    const fs = parseFloat(cs.fontSize);
    const min = minimoExigido(fs, cs.fontWeight);
    if (pior < min) {
      falhas.push({
        txt: txt.slice(0, 40), tag: el.tagName.toLowerCase(),
        cor: cs.color, fundo: piorFundo, fs,
        cr: Math.round(pior * 100) / 100, min, stops: cands.length
      });
    }
  }
  return { falhas, medidos, semFundo };
})
  // Só o corpo: a assinatura vem do `new Function`.
  .replace(/^function auditar\(sel\) \{/, "")
  .replace(/\}$/, "");

const AUDITORIA = new Function("sel", `${FONTE}\n${CORPO_DA_AUDITORIA}`);

async function main() {
  const rota = process.argv[2] || "/app";
  const b = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
  for (const tema of ["light", "dark"]) {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, colorScheme: tema });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await p.fill("input[type=email]", credencial("QA_USER"));
    await p.fill("input[type=password]", credencial("QA_PASS"));
    await Promise.all([
      p.waitForURL(u => !u.pathname.startsWith("/login"), { timeout: 60000 }).catch(() => {}),
      p.click('button[type=submit]')
    ]);
    await p.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(500);
    const r = await p.evaluate(AUDITORIA, SELETOR);
    console.log(`${tema.toUpperCase()}: ${r.falhas.length} reprovações · ${r.medidos} medidos · ${r.semFundo} sem fundo legível`);
    const vistos = new Set();
    for (const f of r.falhas) {
      const k = f.txt + f.cor;
      if (vistos.has(k)) continue;
      vistos.add(k);
      console.log(`   ${String(f.cr).padStart(6)} (min ${f.min})  <${f.tag}> ${f.fs}px  ${f.cor} sobre ${f.fundo}  ${JSON.stringify(f.txt)}`);
    }
    await ctx.close();
  }
  await b.close();
}

main().catch(e => { console.error("ERRO", e.message); process.exit(1); });
