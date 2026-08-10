import { NextResponse } from "next/server";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { inspectLatestSinapiOfficialPackage } from "@/lib/sinapi/automatic-update";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorizedProbe(request: Request) {
  const expected = process.env.SINAPI_PROBE_TOKEN?.trim();
  return Boolean(expected && expected.length >= 32 && request.headers.get("x-sinapi-probe-token") === expected);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!authorizedProbe(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const region = String(url.searchParams.get("region") ?? "SP").toUpperCase();
  const taxRelief = url.searchParams.get("relief") === "true";
  try {
    const result = await inspectLatestSinapiOfficialPackage({ region, taxRelief });
    return NextResponse.json({ ok: true, checkedAt: new Date().toISOString(), region, taxRelief, result });
  } catch (error) {
    reportDataAccessError("sinapi-source-probe.v2", error);
    return NextResponse.json({
      ok: false,
      checkedAt: new Date().toISOString(),
      region,
      taxRelief,
      error: "PROBE_FAILED"
    }, { status: 502 });
  }
}
