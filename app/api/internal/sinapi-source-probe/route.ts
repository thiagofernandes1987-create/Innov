import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";

const PROBE_TOKEN = "sinapi-source-probe-20260729-7f4a9";
const baseUrl = "https://www.caixa.gov.br";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function api(path: string) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: "manual",
    cache: "no-store",
    headers: {
      Cookie: "security=true",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",
      Accept: "application/json;odata=verbose",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.6",
      Referer: "https://www.caixa.gov.br/site/Paginas/downloads.aspx"
    }
  });
  const text = await response.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* diagnóstico retorna preview */ }
  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get("content-type"),
    location: response.headers.get("location"),
    textPreview: text.slice(0, 500),
    json
  };
}

type Category = { ID: number; Title: string };
type FileItem = {
  Title: string;
  Modified: string;
  File_x0020_Type: string;
  FileLeafRef: string;
  EncodedAbsUrl: string;
  Descricao?: string;
  FileSizeDisplay?: number | string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = request.headers.get("x-sinapi-probe-token") ?? url.searchParams.get("token");
  if (token !== PROBE_TOKEN) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const categoriesResponse = await api("/_api/web/lists/getbytitle('LT_T077_Downloads_Categorias')/Items?$select=ID,Title&$top=5000&$orderby=Title");
  const categories = ((categoriesResponse.json as { d?: { results?: Category[] } } | null)?.d?.results ?? []);
  const matches = categories.filter(category => {
    const title = normalize(category.Title);
    return title.includes("sinapi") && title.includes("relatorios mensais") && title.includes("2025");
  });

  const filesByCategory = [];
  for (const category of matches) {
    const path = `/_api/web/lists/getbytitle('Downloads')/Items?$select=Title,Modified,File_x0020_Type,FileLeafRef,EncodedAbsUrl,Descricao,FileSizeDisplay,Categoria/ID&$expand=Categoria&$filter=Categoria/ID%20eq%20${category.ID}%20and%20FSObjType%20eq%200%20and%20OData__ModerationStatus%20eq%200&$top=5000&$orderby=Modified%20desc`;
    const response = await api(path);
    const files = ((response.json as { d?: { results?: FileItem[] } } | null)?.d?.results ?? []);
    filesByCategory.push({
      category,
      response: { ok: response.ok, status: response.status, preview: response.textPreview },
      count: files.length,
      xlsx: files.filter(file => {
        const combined = normalize(`${file.Title} ${file.FileLeafRef} ${file.File_x0020_Type}`);
        return combined.includes("xlsx") || combined.includes("formato xlsx");
      }).slice(0, 20),
      firstFiles: files.slice(0, 10)
    });
  }

  return NextResponse.json({
    ok: categoriesResponse.ok,
    categoriesStatus: categoriesResponse.status,
    categoryCount: categories.length,
    matches,
    filesByCategory,
    categoriesPreview: categories.filter(category => normalize(category.Title).includes("sinapi"))
  });
}
