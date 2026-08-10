import { NextResponse } from "next/server";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { discoverLatestSinapiXlsxSource } from "@/lib/sinapi/automatic-update";
import { parseSinapiOfficialReferencePackage } from "@/lib/sinapi/official-reference-parser";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Sonda de leitura: baixa o pacote oficial e roda o leitor **inteiro**, até a
// fronteira da gravação. É o que responde "o leitor entende o arquivo
// publicado hoje?" sem precisar da credencial de importação.
//
// O token não é versionado: o workflow gera `SINAPI_PROBE_TOKEN` aleatório no
// runner e a rota só aceita o valor pelo header. No deploy público, ausência do
// segredo fecha a rota como 404.

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
    const fonte = await discoverLatestSinapiXlsxSource();
    const resposta = await fetch(fonte.url);
    const pacote = Buffer.from(await resposta.arrayBuffer());
    const lido = parseSinapiOfficialReferencePackage(pacote, {
      sourceUrl: fonte.url,
      region,
      taxRelief
    });

    const porNatureza: Record<string, number> = {};
    for (const insumo of lido.inputs) {
      porNatureza[insumo.itemType] = (porNatureza[insumo.itemType] ?? 0) + 1;
    }
    const comItens = lido.compositions.filter(item => item.items.length > 0).length;

    return NextResponse.json({
      ok: true,
      arquivo: fonte.fileName,
      bytes: pacote.length,
      region,
      taxRelief,
      baseDate: lido.baseDate,
      abas: lido.worksheets,
      insumos: lido.inputs.length,
      insumosPorNatureza: porNatureza,
      composicoes: lido.compositions.length,
      composicoesComItens: comItens,
      amostraInsumo: lido.inputs[0],
      amostraComposicao: lido.compositions[0]
        ? { ...lido.compositions[0], items: lido.compositions[0].items.slice(0, 3) }
        : null
    });
  } catch (error) {
    reportDataAccessError("sinapi-real-read.probe", error);
    return NextResponse.json(
      { ok: false, region, taxRelief, error: "A leitura do pacote SINAPI não pôde ser concluída." },
      { status: 502 }
    );
  }
}
