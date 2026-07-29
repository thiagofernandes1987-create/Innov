import { NextResponse } from "next/server";
import { inspectLatestSinapiOfficialPackage } from "@/lib/sinapi/automatic-update-v2";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PROBE_TOKEN = "sinapi-source-probe-v2-20260729-f19c8";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = request.headers.get("x-sinapi-probe-token") ?? url.searchParams.get("token");
  if (token !== PROBE_TOKEN) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const region = String(url.searchParams.get("region") ?? "SP").toUpperCase();
  const taxRelief = url.searchParams.get("relief") === "true";
  try {
    const result = await inspectLatestSinapiOfficialPackage({ region, taxRelief });
    return NextResponse.json({ ok: true, checkedAt: new Date().toISOString(), region, taxRelief, result });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      checkedAt: new Date().toISOString(),
      region,
      taxRelief,
      error: error instanceof Error ? error.message : "Falha desconhecida"
    }, { status: 502 });
  }
}
