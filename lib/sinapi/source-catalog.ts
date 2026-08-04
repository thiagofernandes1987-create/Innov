export type CaixaSinapiFile = {
  Title?: string | null;
  Modified?: string | null;
  File_x0020_Type?: string | null;
  FileLeafRef?: string | null;
  EncodedAbsUrl?: string | null;
  Descricao?: string | null;
  FileSizeDisplay?: number | string | null;
};

export type SinapiOfficialSource = {
  url: string;
  baseDate: string;
  modifiedAt: string;
  fileName: string;
  title: string;
  description: string;
  declaredSize: number;
  isRectification: boolean;
};

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseSinapiBaseDate(value: unknown) {
  const text = String(value ?? "");
  const match = text.match(/SINAPI[^0-9]{0,30}(20\d{2})[-_ ]?(0[1-9]|1[0-2])/i)
    ?? text.match(/(20\d{2})[-_ ](0[1-9]|1[0-2])/);
  return match ? `${match[1]}-${match[2]}-01` : null;
}

function safeModified(value: unknown) {
  const date = new Date(String(value ?? ""));
  return Number.isFinite(date.getTime()) ? date.toISOString() : "1970-01-01T00:00:00.000Z";
}

function httpsCaixaUrl(value: unknown) {
  let url: URL;
  try {
    url = new URL(String(value ?? ""));
  } catch {
    return null;
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname !== "caixa.gov.br" && !hostname.endsWith(".caixa.gov.br")) return null;
  url.protocol = "https:";
  url.hash = "";
  return url.toString();
}

function toOfficialSource(file: CaixaSinapiFile): SinapiOfficialSource | null {
  const fileName = String(file.FileLeafRef ?? "").trim();
  const title = String(file.Title ?? fileName).trim();
  const combined = normalize(`${title} ${fileName} ${file.Descricao ?? ""} ${file.File_x0020_Type ?? ""}`);
  const baseDate = parseSinapiBaseDate(`${title} ${fileName} ${file.Descricao ?? ""}`);
  const url = httpsCaixaUrl(file.EncodedAbsUrl);
  const declaredSize = Number(file.FileSizeDisplay ?? 0);

  if (!combined.includes("sinapi") || !combined.includes("xlsx")) return null;
  if (!fileName.toLowerCase().endsWith(".zip")) return null;
  if (!baseDate || !url) return null;
  if (!Number.isFinite(declaredSize) || declaredSize < 1 || declaredSize > 180 * 1024 * 1024) return null;

  return {
    url,
    baseDate,
    modifiedAt: safeModified(file.Modified),
    fileName,
    title,
    description: String(file.Descricao ?? "").trim(),
    declaredSize,
    isRectification: /retifica/i.test(`${title} ${fileName} ${file.Descricao ?? ""}`)
  };
}

export function selectLatestSinapiXlsxFile(files: CaixaSinapiFile[]) {
  const candidates = files
    .map(toOfficialSource)
    .filter((value): value is SinapiOfficialSource => Boolean(value))
    .sort((left, right) => {
      const byBase = right.baseDate.localeCompare(left.baseDate);
      if (byBase !== 0) return byBase;
      const byModified = right.modifiedAt.localeCompare(left.modifiedAt);
      if (byModified !== 0) return byModified;
      if (left.isRectification !== right.isRectification) return left.isRectification ? -1 : 1;
      return right.fileName.localeCompare(left.fileName);
    });

  return candidates[0] ?? null;
}
