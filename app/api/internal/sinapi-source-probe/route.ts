import { NextResponse } from "next/server";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { inspectSinapiArchiveLayout } from "@/lib/sinapi/archive-layout-diagnostic";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const SOURCE_URL = "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-06-formato-xlsx.zip";
const MAX_BYTES = 25 * 1024 * 1024;

class SourceProbeFailure extends Error {
  constructor(readonly code: string, readonly upstreamStatus: number | null = null) {
    super(code);
  }
}

function authorizedProbe(request: Request) {
  const expected = process.env.SINAPI_PROBE_TOKEN?.trim();
  return Boolean(expected && expected.length >= 32 && request.headers.get("x-sinapi-probe-token") === expected);
}

async function readLimited(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new SourceProbeFailure("EMPTY_BODY");
  const chunks: Buffer[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    size += value.length;
    if (size > MAX_BYTES) throw new SourceProbeFailure("MAX_BYTES_EXCEEDED");
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, size);
}

export async function GET(request: Request) {
  if (!authorizedProbe(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    if (!response.ok) throw new SourceProbeFailure("SOURCE_HTTP_ERROR", response.status);
    const archive = await readLimited(response);
    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      sourceUrl: SOURCE_URL,
      downloadedBytes: archive.length,
      layout: inspectSinapiArchiveLayout(archive)
    });
  } catch (error) {
    if (error instanceof SourceProbeFailure) {
      return NextResponse.json(
        { ok: false, checkedAt: new Date().toISOString(), error: error.code, upstreamStatus: error.upstreamStatus },
        { status: 502 }
      );
    }
    reportDataAccessError("sinapi-source-probe.v1", error);
    return NextResponse.json({ ok: false, checkedAt: new Date().toISOString(), error: "PROBE_FAILED" }, { status: 502 });
  }
}
