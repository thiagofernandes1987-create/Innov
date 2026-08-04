import { NextResponse } from "next/server";
import { inspectSinapiArchiveLayout } from "@/lib/sinapi/archive-layout-diagnostic";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PROBE_TOKEN = "sinapi-source-probe-20260729-7f4a9";
const SOURCE_URL = "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-06-formato-xlsx.zip";
const MAX_BYTES = 25 * 1024 * 1024;

async function readLimited(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Resposta sem corpo");
  const chunks: Buffer[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    size += value.length;
    if (size > MAX_BYTES) throw new Error("Arquivo excedeu o limite da sonda");
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, size);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = request.headers.get("x-sinapi-probe-token") ?? url.searchParams.get("token");
  if (token !== PROBE_TOKEN) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const response = await fetch(SOURCE_URL, {
      redirect: "manual",
      cache: "no-store",
      headers: {
        Cookie: "security=true",
        "User-Agent": "Mozilla/5.0 Innovar-SINAPI-Diagnostic/1.0",
        Accept: "application/zip,application/octet-stream;q=0.9,*/*;q=0.5",
        Referer: "https://www.caixa.gov.br/site/Paginas/downloads.aspx"
      }
    });
    if (!response.ok) throw new Error(`CAIXA respondeu HTTP ${response.status}`);
    const archive = await readLimited(response);
    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      sourceUrl: SOURCE_URL,
      downloadedBytes: archive.length,
      layout: inspectSinapiArchiveLayout(archive)
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Falha desconhecida"
    }, { status: 502 });
  }
}
