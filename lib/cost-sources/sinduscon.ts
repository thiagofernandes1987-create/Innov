import { createHash } from "node:crypto";

export const SINDUSCON_CUB_SOURCE_KEY = "SINDUSCON_SP_CUB";
export const SINDUSCON_CUB_FEED_URL = "https://sindusconsp.com.br/?s=CUB&feed=rss2";

const MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  março: 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12
};

export type SindusconCubRecord = {
  sourceKey: typeof SINDUSCON_CUB_SOURCE_KEY;
  sourceName: "SindusCon-SP";
  region: "SP";
  referenceCode: "R8-N";
  baseDate: string;
  publicationDate: string | null;
  taxRelief: boolean;
  unit: "m²";
  totalCost: number;
  materialsCost: number | null;
  laborCost: number | null;
  administrativeCost: number | null;
  equipmentCost: null;
  monthlyChangeRate: number | null;
  yearChangeRate: number | null;
  twelveMonthChangeRate: number | null;
  sourceUrl: string;
  sourceSha256: string;
  rawPayload: Record<string, unknown>;
};

export type SindusconCubPublication = {
  sourceUrl: string;
  title: string;
  publicationDate: string | null;
  baseDate: string;
  records: [SindusconCubRecord, SindusconCubRecord];
};

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function toPlainText(html: string) {
  return decodeEntities(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBrazilianNumber(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(parsed)) throw new Error(`Número brasileiro inválido: ${value}`);
  return parsed;
}

function parsePercent(value: string | undefined) {
  if (!value) return null;
  return parseBrazilianNumber(value) / 100;
}

function isoDate(year: number, month: number, day = 1) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function extractPublicationDate(html: string, text: string) {
  const datetime = html.match(/<time\b[^>]*datetime=["'](\d{4}-\d{2}-\d{2})/i)?.[1];
  if (datetime) return datetime;
  const written = text.match(/\b(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(20\d{2})\b/i);
  if (!written) return null;
  const month = MONTHS[written[2].toLowerCase()];
  if (!month) return null;
  return isoDate(Number(written[3]), month, Number(written[1]));
}

function extractBaseDate(text: string) {
  const patterns = [
    /por metro quadrado em\s+([a-zç]+)\s+de\s+(20\d{2})/i,
    /em\s+([a-zç]+)\s+de\s+(20\d{2})[\s\S]{0,160}?CUB/i,
    /CUB[\s\S]{0,220}?\b([a-zç]+)\s+de\s+(20\d{2})/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const month = MONTHS[match[1].toLowerCase()];
    if (month) return isoDate(Number(match[2]), month);
  }
  throw new Error("A data-base do CUB não pôde ser comprovada na publicação oficial.");
}

function extractMoney(text: string, patterns: RegExp[], label: string) {
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1];
    if (value) return parseBrazilianNumber(value);
  }
  throw new Error(`${label} não foi encontrado na publicação oficial.`);
}

function optionalMoney(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1];
    if (value) return parseBrazilianNumber(value);
  }
  return null;
}

function hashRecord(value: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function findLatestCubArticleUrl(feedXml: string) {
  const items = feedXml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  for (const item of items) {
    const title = toPlainText(item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    if (!/\bCUB\b/i.test(title)) continue;
    const link = decodeEntities(item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? "").trim();
    if (/^https:\/\/sindusconsp\.com\.br\//i.test(link)) return { title, link };
  }
  throw new Error("O feed oficial não informou uma publicação recente do CUB.");
}

export function parseSindusconCubPublication(
  html: string,
  sourceUrl: string,
  fallbackTitle = "CUB SindusCon-SP"
): SindusconCubPublication {
  if (!/^https:\/\/sindusconsp\.com\.br\//i.test(sourceUrl)) {
    throw new Error("A origem do CUB não pertence ao domínio oficial SindusCon-SP.");
  }

  const text = toPlainText(html);
  const title = toPlainText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? fallbackTitle);
  const publicationDate = extractPublicationDate(html, text);
  const baseDate = extractBaseDate(text);

  const normalCost = extractMoney(text, [
    /CUB representativo[\s\S]{0,420}?R\$\s*([\d.]+,\d{2})\s+por metro quadrado/i,
    /Sem desoneração\s*\.?\s*R8-N[\s\S]{0,80}?R\$?\s*([\d.]+,\d{2})/i
  ], "CUB sem desoneração");

  const relievedCost = extractMoney(text, [
    /com desoneração[\s\S]{0,1200}?(?:atingiu|subiu para|ficou em)\s*R\$\s*([\d.]+,\d{2})/i,
    /Com desoneração\s*\.?\s*R8-N[\s\S]{0,80}?R\$?\s*([\d.]+,\d{2})/i
  ], "CUB com desoneração");

  const laborCost = optionalMoney(text, [
    /R\$\s*([\d.]+,\d{2})\s+referentes?\s+à\s+mão de obra/i
  ]);
  const materialsCost = optionalMoney(text, [
    /R\$\s*([\d.]+,\d{2})\s+aos\s+materiais/i
  ]);
  const administrativeCost = optionalMoney(text, [
    /R\$\s*([\d.]+,\d{2})\s+às\s+despesas administrativas/i
  ]);

  const normalRates = text.match(
    /variação positiva de\s*([\d.,]+)%[\s\S]{0,320}?acumulou elevação de\s*([\d.,]+)%\s+no ano\s+e de\s*([\d.,]+)%\s+nos últimos 12 meses/i
  );
  const relievedRates = text.match(
    /com desoneração[\s\S]{0,700}?variação positiva de\s*([\d.,]+)%[\s\S]{0,360}?ano[^\d]*([\d.,]+)%[\s\S]{0,220}?12 meses[^\d]*([\d.,]+)%/i
  );

  const common = {
    sourceKey: SINDUSCON_CUB_SOURCE_KEY,
    sourceName: "SindusCon-SP",
    region: "SP",
    referenceCode: "R8-N",
    baseDate,
    publicationDate,
    unit: "m²",
    equipmentCost: null,
    sourceUrl
  } as const;

  const normalPayload = {
    ...common,
    taxRelief: false,
    totalCost: normalCost,
    materialsCost: null,
    laborCost: null,
    administrativeCost: null,
    monthlyChangeRate: parsePercent(normalRates?.[1]),
    yearChangeRate: parsePercent(normalRates?.[2]),
    twelveMonthChangeRate: parsePercent(normalRates?.[3])
  } as const;
  const relievedPayload = {
    ...common,
    taxRelief: true,
    totalCost: relievedCost,
    materialsCost,
    laborCost,
    administrativeCost,
    monthlyChangeRate: parsePercent(relievedRates?.[1]),
    yearChangeRate: parsePercent(relievedRates?.[2]),
    twelveMonthChangeRate: parsePercent(relievedRates?.[3])
  } as const;

  const normal: SindusconCubRecord = {
    ...normalPayload,
    sourceSha256: hashRecord(normalPayload),
    rawPayload: { title, extraction: "official-article" }
  };
  const relieved: SindusconCubRecord = {
    ...relievedPayload,
    sourceSha256: hashRecord(relievedPayload),
    rawPayload: { title, extraction: "official-article" }
  };

  if (normal.totalCost <= 0 || relieved.totalCost <= 0) {
    throw new Error("A publicação retornou custos não positivos.");
  }
  if (normal.totalCost < relieved.totalCost) {
    throw new Error("O CUB sem desoneração ficou menor que o desonerado; sincronização recusada.");
  }
  if (materialsCost != null && laborCost != null && administrativeCost != null) {
    const componentTotal = materialsCost + laborCost + administrativeCost;
    if (Math.abs(componentTotal - relievedCost) > 0.05) {
      throw new Error("A soma dos componentes do CUB desonerado diverge do total oficial.");
    }
  }

  return { sourceUrl, title, publicationDate, baseDate, records: [normal, relieved] };
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "InnovarPlatform-CostSourceSync/1.0" },
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Fonte oficial retornou HTTP ${response.status}.`);
  return response.text();
}

export async function fetchLatestSindusconCub() {
  const feedUrl = process.env.SINDUSCON_CUB_FEED_URL?.trim() || SINDUSCON_CUB_FEED_URL;
  const feed = await fetchText(feedUrl);
  const latest = findLatestCubArticleUrl(feed);
  const article = await fetchText(latest.link);
  return parseSindusconCubPublication(article, latest.link, latest.title);
}
