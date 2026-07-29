import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";

const PROBE_TOKEN = "sinapi-source-probe-20260729-7f4a9";
const pageUrl = "https://www.caixa.gov.br/site/Paginas/downloads.aspx";

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function relevantLinks(html: string) {
  const links = new Set<string>();
  const expression = /(?:href|src|data-url|data-href)\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
  for (const match of html.matchAll(expression)) {
    const raw = decodeHtml(match[1] ?? match[2] ?? "");
    if (!raw) continue;
    try {
      const url = new URL(raw, pageUrl);
      const combined = `${decodeURIComponent(url.pathname)} ${url.search} ${raw}`.toLowerCase();
      if (combined.includes("sinapi") || combined.includes("xlsx") || combined.includes("categoria_888") || combined.includes("downloadid")) {
        links.add(url.toString());
      }
    } catch {
      // Diagnóstico ignora URL inválida.
    }
  }
  return [...links].slice(0, 300);
}

function snippets(html: string, term: string) {
  const normalized = html.replace(/\r?\n/g, " ");
  const lower = normalized.toLowerCase();
  const result: string[] = [];
  let cursor = 0;
  while (result.length < 20) {
    const index = lower.indexOf(term.toLowerCase(), cursor);
    if (index < 0) break;
    result.push(normalized.slice(Math.max(0, index - 500), Math.min(normalized.length, index + term.length + 1200)));
    cursor = index + term.length;
  }
  return result;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = request.headers.get("x-sinapi-probe-token") ?? url.searchParams.get("token");
  if (token !== PROBE_TOKEN) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const response = await fetch(pageUrl, {
    redirect: "manual",
    cache: "no-store",
    headers: {
      Cookie: "security=true",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.6",
      Referer: "https://www.caixa.gov.br/"
    }
  });
  const html = await response.text();
  return NextResponse.json({
    ok: response.ok,
    status: response.status,
    length: html.length,
    links: relevantLinks(html),
    sinapi: snippets(html, "SINAPI"),
    category888: snippets(html, "categoria_888"),
    reports2025: snippets(html, "Relatórios mensais - a partir de 2025"),
    formatXlsx: snippets(html, "formato XLSX")
  });
}
