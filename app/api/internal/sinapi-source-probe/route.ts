import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";

const PROBE_TOKEN = "sinapi-source-probe-20260729-7f4a9";
const targets = [
  "https://www.caixa.gov.br/Downloads/sinapi-historico-de-encargos-e-notas/Notas_SINAPI.pdf",
  "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais-a-partir-2025/SINAPI202606formatoxlsx.zip",
  "https://www.caixa.gov.br/site/Paginas/downloads.aspx#categoria_888",
  "https://www.caixa.gov.br/site/Paginas/downloads.aspx?downloadid=10439"
];

async function inspect(target: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(target, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Range: "bytes=0-63",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",
        Accept: "text/html,application/pdf,application/zip,application/octet-stream;q=0.9,*/*;q=0.5",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.6",
        Referer: "https://www.caixa.gov.br/"
      }
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    const headers = Object.fromEntries(
      [...response.headers.entries()].filter(([name]) => [
        "location", "set-cookie", "content-type", "content-length", "content-range", "server", "via", "x-cache", "x-powered-by"
      ].includes(name.toLowerCase()))
    );
    return {
      target,
      status: response.status,
      statusText: response.statusText,
      headers,
      byteCount: bytes.length,
      signatureHex: Array.from(bytes.slice(0, 12)).map(value => value.toString(16).padStart(2, "0")).join(""),
      textPreview: new TextDecoder().decode(bytes.slice(0, 160)).replace(/\s+/g, " ")
    };
  } catch (error) {
    return { target, error: error instanceof Error ? `${error.name}: ${error.message}` : "erro" };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = request.headers.get("x-sinapi-probe-token") ?? url.searchParams.get("token");
  if (token !== PROBE_TOKEN) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const results = [];
  for (const target of targets) results.push(await inspect(target));
  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString(), results });
}
