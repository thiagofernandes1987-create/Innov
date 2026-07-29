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

function attributeUrls(html: string, attribute: string) {
  const urls = new Set<string>();
  const expression = new RegExp(`${attribute}\\s*=\\s*(?:\"([^\"]+)\"|'([^']+)')`, "gi");
  for (const match of html.matchAll(expression)) {
    const raw = decodeHtml(match[1] ?? match[2] ?? "");
    if (!raw || raw.startsWith("javascript:") || raw.startsWith("#")) continue;
    try { urls.add(new URL(raw, pageUrl).toString()); } catch { /* URL inválida */ }
  }
  return [...urls];
}

function endpointCandidates(html: string) {
  const candidates = new Set<string>();
  const decoded = decodeHtml(html.replace(/\\\//g, "/"));
  const expressions = [
    /(?:https?:)?\/\/[^"'\s<>]+/gi,
    /(?:\/|\.\.\/)[A-Za-z0-9_./?=&%#-]+(?:\.asmx|\.svc|\.ashx|\.json|\.js|\.aspx|\/_api\/[^"'\s<>]*)/gi,
    /["']([^"']*(?:download|categoria|arquivo|consulta|servico|service|api)[^"']*)["']/gi
  ];
  for (const expression of expressions) {
    for (const match of decoded.matchAll(expression)) {
      const raw = (match[1] ?? match[0] ?? "").trim();
      if (!raw || raw.length > 1_500) continue;
      const lower = raw.toLowerCase();
      if (!/(download|categoria|arquivo|consulta|servico|service|api)/.test(lower)) continue;
      try { candidates.add(new URL(raw, pageUrl).toString()); }
      catch { candidates.add(raw); }
    }
  }
  return [...candidates].slice(0, 500);
}

function snippets(html: string, term: string) {
  const normalized = html.replace(/\r?\n/g, " ");
  const lower = normalized.toLowerCase();
  const result: string[] = [];
  let cursor = 0;
  while (result.length < 30) {
    const index = lower.indexOf(term.toLowerCase(), cursor);
    if (index < 0) break;
    result.push(normalized.slice(Math.max(0, index - 700), Math.min(normalized.length, index + term.length + 1_500)));
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
    scripts: attributeUrls(html, "src").filter(url => /\.js(?:\?|$)/i.test(url)),
    styles: attributeUrls(html, "href").filter(url => /\.css(?:\?|$)/i.test(url)),
    endpoints: endpointCandidates(html),
    downloadSnippets: snippets(html, "download"),
    apiSnippets: snippets(html, "_api"),
    ajaxSnippets: snippets(html, "ajax")
  });
}
