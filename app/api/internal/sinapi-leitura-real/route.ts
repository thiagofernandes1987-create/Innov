import { NextResponse } from "next/server";
import { discoverLatestSinapiXlsxSource } from "@/lib/sinapi/automatic-update";
import { parseSinapiOfficialReferencePackage } from "@/lib/sinapi/official-reference-parser";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Sonda de leitura: baixa o pacote oficial e roda o leitor **inteiro**, até a
// fronteira da gravação. É o que responde "o leitor entende o arquivo
// publicado hoje?" sem precisar da credencial de importação.
//
// Existe porque a falha que originou a T-37.1 passou quarenta dias invisível:
// os testes exercitavam exemplos, e ninguém abria o arquivo de verdade.

const TOKEN = "sinapi-leitura-real-20260804-3b1d7";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = request.headers.get("x-sinapi-probe-token") ?? url.searchParams.get("token");
  if (token !== TOKEN) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    return NextResponse.json(
      { ok: false, region, taxRelief, error: error instanceof Error ? error.message : "Falha desconhecida" },
      { status: 502 }
    );
  }
}
