import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";

const PROBE_TOKEN = "sinapi-source-probe-20260729-7f4a9";
const scriptUrl = "https://www.caixa.gov.br/Style%20Library/js/downloads.js";

function snippets(source: string, term: string) {
  const lower = source.toLowerCase();
  const result: string[] = [];
  let cursor = 0;
  while (result.length < 30) {
    const index = lower.indexOf(term.toLowerCase(), cursor);
    if (index < 0) break;
    result.push(source.slice(Math.max(0, index - 700), Math.min(source.length, index + term.length + 1_700)));
    cursor = index + term.length;
  }
  return result;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = request.headers.get("x-sinapi-probe-token") ?? url.searchParams.get("token");
  if (token !== PROBE_TOKEN) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const response = await fetch(scriptUrl, {
    redirect: "manual",
    cache: "no-store",
    headers: {
      Cookie: "security=true",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",
      Accept: "application/javascript,text/javascript,*/*;q=0.5",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.6",
      Referer: "https://www.caixa.gov.br/site/Paginas/downloads.aspx"
    }
  });
  const source = await response.text();
  return NextResponse.json({
    ok: response.ok,
    status: response.status,
    length: source.length,
    source: source.length <= 60_000 ? source : null,
    ajax: snippets(source, "ajax"),
    url: snippets(source, "url"),
    categoria: snippets(source, "categoria"),
    download: snippets(source, "download"),
    api: snippets(source, "_api"),
    service: snippets(source, "service")
  });
}
