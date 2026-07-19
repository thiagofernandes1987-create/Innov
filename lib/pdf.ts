import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

export type CommercialPdfSection = {
  title: string;
  body: string;
};

export type CommercialPdfInput = {
  documentType: "PROPOSTA" | "CONTRATO" | "ADITIVO";
  code: string;
  version: number;
  title: string;
  clientName: string;
  issueDate: string;
  validUntil?: string | null;
  commercialValue?: number | null;
  currency?: string;
  sections: CommercialPdfSection[];
  footerNote?: string;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function sanitizeText(value: string): string {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\u0009\u000A\u000D\u0020-\u00FF]/g, "");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = sanitizeText(text).split(/\n+/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }

    let current = words[0] ?? "";
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }

  return lines;
}

function drawHeader(page: PDFPage, bold: PDFFont, regular: PDFFont, input: CommercialPdfInput) {
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 145, width: PAGE_WIDTH, height: 145, color: rgb(0.035, 0.094, 0.129) });
  page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 80, width: 36, height: 36, color: rgb(0.129, 0.267, 0.533) });
  page.drawText("I", { x: MARGIN + 14, y: PAGE_HEIGHT - 69, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText("INNOVAR", { x: MARGIN + 48, y: PAGE_HEIGHT - 57, size: 14, font: bold, color: rgb(1, 1, 1) });
  page.drawText("CONSTRUCOES E REFORMAS", { x: MARGIN + 48, y: PAGE_HEIGHT - 73, size: 8, font: regular, color: rgb(0.72, 0.8, 0.84) });
  page.drawText(`${input.documentType}  ${input.code}  V${input.version}`, {
    x: MARGIN,
    y: PAGE_HEIGHT - 114,
    size: 9,
    font: bold,
    color: rgb(0.58, 0.72, 0.9)
  });
  page.drawText(sanitizeText(input.title), {
    x: MARGIN,
    y: PAGE_HEIGHT - 137,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
    maxWidth: CONTENT_WIDTH
  });
}

function drawFooter(page: PDFPage, regular: PDFFont, pageNumber: number, note: string) {
  page.drawLine({
    start: { x: MARGIN, y: 42 },
    end: { x: PAGE_WIDTH - MARGIN, y: 42 },
    color: rgb(0.88, 0.9, 0.93),
    thickness: 0.7
  });
  page.drawText(sanitizeText(note), { x: MARGIN, y: 25, size: 7.5, font: regular, color: rgb(0.36, 0.42, 0.49), maxWidth: CONTENT_WIDTH - 50 });
  page.drawText(String(pageNumber), { x: PAGE_WIDTH - MARGIN - 12, y: 25, size: 8, font: regular, color: rgb(0.36, 0.42, 0.49) });
}

export async function generateCommercialPdf(input: CommercialPdfInput): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle(`${input.documentType} ${input.code}`);
  document.setAuthor("Innovar Construcoes e Reformas");
  document.setCreator("Innovar Platform");
  document.setProducer("Innovar Platform - Etapa 9");
  document.setCreationDate(new Date());

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);

  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawHeader(page, bold, regular, input);
  let y = PAGE_HEIGHT - 180;
  let pageNumber = 1;
  const footer = input.footerNote ?? "Documento comercial versionado. Consulte a Innovar para confirmar validade e assinatura.";

  const ensureSpace = (height: number) => {
    if (y - height >= 62) return;
    drawFooter(page, regular, pageNumber, footer);
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNumber += 1;
    drawHeader(page, bold, regular, input);
    y = PAGE_HEIGHT - 180;
  };

  const meta = [
    ["Cliente", input.clientName],
    ["Emissao", input.issueDate],
    ["Validade", input.validUntil ?? "Conforme documento"],
    ["Versao", `V${input.version}`]
  ];

  for (const [label, value] of meta) {
    page.drawText(label.toUpperCase(), { x: MARGIN, y, size: 7.5, font: bold, color: rgb(0.36, 0.42, 0.49) });
    page.drawText(sanitizeText(value), { x: MARGIN + 88, y, size: 10, font: regular, color: rgb(0.06, 0.09, 0.16) });
    y -= 18;
  }

  if (input.commercialValue != null) {
    const formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: input.currency ?? "BRL"
    }).format(input.commercialValue);
    y -= 6;
    page.drawRectangle({ x: MARGIN, y: y - 42, width: CONTENT_WIDTH, height: 54, color: rgb(0.95, 0.93, 0.9) });
    page.drawText("VALOR COMERCIAL", { x: MARGIN + 16, y: y - 4, size: 8, font: bold, color: rgb(0.36, 0.3, 0.24) });
    page.drawText(formatted, { x: MARGIN + 16, y: y - 28, size: 20, font: bold, color: rgb(0.129, 0.267, 0.533) });
    y -= 70;
  } else {
    y -= 18;
  }

  for (const section of input.sections) {
    const bodyLines = wrapText(section.body || "-", regular, 10, CONTENT_WIDTH);
    ensureSpace(36 + bodyLines.length * 14);
    page.drawText(sanitizeText(section.title).toUpperCase(), { x: MARGIN, y, size: 10, font: bold, color: rgb(0.129, 0.267, 0.533) });
    y -= 20;
    for (const line of bodyLines) {
      ensureSpace(16);
      page.drawText(line, { x: MARGIN, y, size: 10, font: regular, color: rgb(0.12, 0.16, 0.23) });
      y -= 14;
    }
    y -= 13;
  }

  drawFooter(page, regular, pageNumber, footer);
  return document.save();
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
