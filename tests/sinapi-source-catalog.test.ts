import { describe, expect, it } from "vitest";
import { parseSinapiBaseDate, selectLatestSinapiXlsxFile } from "@/lib/sinapi/source-catalog";

const june = {
  Title: "SINAPI-2026-06-formato-xlsx",
  FileLeafRef: "SINAPI-2026-06-formato-xlsx.zip",
  File_x0020_Type: "zip",
  Descricao: "Relatórios SINAPI JUN-2026 formato XLSX",
  Modified: "2026-07-10T16:47:01Z",
  EncodedAbsUrl: "http://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-06-formato-xlsx.zip",
  FileSizeDisplay: "15715816"
};

describe("catálogo oficial SINAPI da CAIXA", () => {
  it("seleciona o mês mais recente e força HTTPS", () => {
    const selected = selectLatestSinapiXlsxFile([
      {
        ...june,
        Title: "SINAPI-2026-05-formato-xlsx",
        FileLeafRef: "SINAPI-2026-05-formato-xlsx.zip",
        EncodedAbsUrl: "http://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-05-formato-xlsx.zip",
        Modified: "2026-06-12T17:35:27Z"
      },
      june,
      {
        ...june,
        Title: "SINAPI-2026-06-formato-pdf",
        FileLeafRef: "SINAPI-2026-06-formato-pdf.zip",
        Descricao: "Relatórios SINAPI JUN-2026 formato PDF"
      }
    ]);

    expect(selected).toMatchObject({
      baseDate: "2026-06-01",
      fileName: "SINAPI-2026-06-formato-xlsx.zip",
      declaredSize: 15_715_816,
      url: "https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-06-formato-xlsx.zip"
    });
  });

  it("prefere a retificação mais recente do mesmo mês", () => {
    const selected = selectLatestSinapiXlsxFile([
      june,
      {
        ...june,
        Title: "SINAPI-2026-06-formato-xlsx_Retificacao01",
        FileLeafRef: "SINAPI-2026-06-formato-xlsx_Retificacao01.zip",
        Descricao: "RETIFICAÇÃO Relatórios SINAPI JUN-2026 formato XLSX",
        Modified: "2026-07-15T10:00:00Z",
        EncodedAbsUrl: "http://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-06-formato-xlsx_Retificacao01.zip"
      }
    ]);

    expect(selected?.isRectification).toBe(true);
    expect(selected?.fileName).toContain("Retificacao01");
  });

  it("recusa arquivo externo, PDF e tamanho anormal", () => {
    expect(selectLatestSinapiXlsxFile([
      { ...june, EncodedAbsUrl: "https://example.com/SINAPI-2026-06-formato-xlsx.zip" },
      { ...june, FileLeafRef: "SINAPI-2026-06-formato-pdf.zip", Title: "SINAPI PDF", Descricao: "PDF" },
      { ...june, FileSizeDisplay: String(500 * 1024 * 1024) }
    ])).toBeNull();
  });

  it("interpreta datas com e sem separadores", () => {
    expect(parseSinapiBaseDate("SINAPI-2026-06-formato-xlsx.zip")).toBe("2026-06-01");
    expect(parseSinapiBaseDate("SINAPIReferencia202606.xlsx")).toBe("2026-06-01");
  });
});
