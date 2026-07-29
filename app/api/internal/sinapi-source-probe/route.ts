import { NextResponse } from "next/server";
import { discoverLatestSinapiXlsxUrl } from "@/lib/sinapi/automatic-update";

export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";

const PROBE_TOKEN = "sinapi-source-probe-20260729-7f4a9";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = request.headers.get("x-sinapi-probe-token") ?? url.searchParams.get("token");
  if (token !== PROBE_TOKEN) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const sourceUrl = await discoverLatestSinapiXlsxUrl();
    return NextResponse.json({ ok: true, sourceUrl, checkedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Falha desconhecida"
    }, { status: 502 });
  }
}
