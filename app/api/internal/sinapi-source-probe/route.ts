import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PROBE_TOKEN = "sinapi-source-probe-20260729-7f4a9";
const folder = "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais-a-partir-2025/";
const pages = [
  "https://www.caixa.gov.br/site/Paginas/downloads.aspx#categoria_888",
  folder,
  "https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/Paginas/default.aspx"
];

function extractLinks(html: string, base: string) {
  const links = new Set<string>();
  for (const match of html.matchAll(/(?:href|src)\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)) {
    const value = match[1] ?? match[2];
    if (!value) continue;
    try {
      const url = new URL(value.replace(/&amp;/g, "&"), base);
      const normalized = decodeURIComponent(url.pathname).toLowerCase();
      if (normalized.includes("sinapi") || normalized.includes("xlsx") || normalized.includes("categoria_888")) {
        links.add(url.toString());
      }
    } catch {
      // Diagnóstico ignora links inválidos.
    }
  }
  for (const match of html.matchAll(/(?:https:\/\/[^"'\s<>]+|\/Downloads\/[^"'\s<>]+)/gi)) {
    try {
      const url = new URL(match[0].replace(/&amp;/g, "&"), base);
      const normalized = decodeURIComponent(url.pathname).toLowerCase();
      if (normalized.includes("sinapi") || normalized.includes("xlsx")) links.add(url.toString());
    } catch {
      // Diagnóstico ignora links inválidos.
    }
  }
  return [...links].slice(0, 80);
}

function candidateNames(period: string) {
  const year = period.slice(0, 4);
  const month = period.slice(4);
  return [
    `SINAPI${period}formatoxlsx.zip`,
    `SINAPI_${period}_formato_xlsx.zip`,
    `SINAPI${period}_formato_xlsx.zip`,
    `SINAPI_${period}_formatoxlsx.zip`,
    `SINAPI-${year}-${month}-formato-xlsx.zip`,
    `SINAPI_${year}_${month}_Formato_XLSX.zip`,
    `SINAPI${period}FormatoXLSX.zip`
  ];
}

async function inspectCandidate(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: { Range: "bytes=0-15", "User-Agent": "Innovar-SINAPI-Probe/1.0" }
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      url,
      status: response.status,
      location: response.headers.get("location"),
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
      signature: Array.from(bytes.slice(0, 4)).map(value => value.toString(16).padStart(2, "0")).join("")
    };
  } catch (error) {
    return { url, error: error instanceof Error ? error.message : "erro" };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = request.headers.get("x-sinapi-probe-token") ?? requestUrl.searchParams.get("token");
  if (token !== PROBE_TOKEN) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pageResults = [];
  for (const page of pages) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(page, {
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 Innovar-SINAPI-Probe/1.0" }
      });
      const text = await response.text();
      pageResults.push({
        page,
        status: response.status,
        finalUrl: response.url,
        contentType: response.headers.get("content-type"),
        length: text.length,
        links: extractLinks(text, response.url || page),
        sinapiSnippets: text
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .match(/.{0,80}SINAPI.{0,160}/gi)
          ?.slice(0, 12) ?? []
      });
    } catch (error) {
      pageResults.push({ page, error: error instanceof Error ? error.message : "erro" });
    } finally {
      clearTimeout(timer);
    }
  }

  const candidateUrls = ["202606", "202605", "202604"]
    .flatMap(candidateNames)
    .map(name => new URL(name, folder).toString());
  const candidateResults = [];
  for (const candidate of candidateUrls) candidateResults.push(await inspectCandidate(candidate));

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    pageResults,
    candidateResults
  });
}
