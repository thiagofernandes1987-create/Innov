import { NextResponse } from "next/server";
import { discoverLatestSinapiXlsxUrl } from "@/lib/sinapi/automatic-update";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const PROBE_TOKEN = "sinapi-source-probe-20260729-7f4a9";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = request.headers.get("x-sinapi-probe-token") ?? url.searchParams.get("token");
  if (token !== PROBE_TOKEN) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const sourceUrl = await discoverLatestSinapiXlsxUrl();
    const response = await fetch(sourceUrl, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: { Range: "bytes=0-31" }
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    return NextResponse.json({
      ok: response.ok || response.status === 206,
      sourceUrl,
      status: response.status,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
      contentRange: response.headers.get("content-range"),
      zipSignature: Array.from(bytes.slice(0, 4)).map(value => value.toString(16).padStart(2, "0")).join("")
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Falha desconhecida"
    }, { status: 502 });
  }
}
