import { describe, expect, it } from "vitest";
import {
  findLatestCubArticleUrl,
  parseSindusconCubPublication
} from "@/lib/cost-sources/sinduscon";

const article = `
<!doctype html>
<html lang="pt-BR">
<head><title>CUB paulista registra maior alta de 2026 em junho</title></head>
<body>
  <h1>CUB paulista registra maior alta de 2026 em junho</h1>
  <time datetime="2026-07-01T20:20:05-03:00">01 de julho de 2026</time>
  <p>O Custo Unitário Básico global registrou variação positiva de 2,24% em junho de 2026.
  Com o resultado, o indicador acumulou elevação de 4,59% no ano e de 6,50% nos últimos 12 meses.</p>
  <p>O CUB representativo da construção paulista (padrão R8-N) foi apurado em
  R$ 2.221,44 por metro quadrado em junho de 2026.</p>
  <h3>Com desoneração</h3>
  <p>Nas obras incluídas na desoneração da folha de pagamentos, o CUB registrou
  variação positiva de 2,20% em junho. No acumulado do ano, o índice apresentou
  elevação de 6,46%, enquanto a variação em 12 meses foi de 8,38%.</p>
  <p>O custo médio da construção paulista (padrão R8-N) com desoneração atingiu
  R$ 2.146,08 por metro quadrado no mês, sendo R$ 1.192,01 referentes à mão de obra,
  R$ 892,29 aos materiais e R$ 61,78 às despesas administrativas.</p>
</body>
</html>`;

describe("SindusCon-SP CUB", () => {
  it("localiza a publicação oficial mais recente no feed", () => {
    const feed = `
      <rss><channel>
        <item><title>Notícia genérica</title><link>https://sindusconsp.com.br/noticia/</link></item>
        <item>
          <title><![CDATA[CUB paulista registra maior alta de 2026 em junho]]></title>
          <link>https://sindusconsp.com.br/cub-paulista-registra-maior-alta-de-2026-em-junho/</link>
        </item>
      </channel></rss>`;

    expect(findLatestCubArticleUrl(feed)).toEqual({
      title: "CUB paulista registra maior alta de 2026 em junho",
      link: "https://sindusconsp.com.br/cub-paulista-registra-maior-alta-de-2026-em-junho/"
    });
  });

  it("extrai valores, componentes, data-base e hashes", () => {
    const parsed = parseSindusconCubPublication(
      article,
      "https://sindusconsp.com.br/cub-paulista-registra-maior-alta-de-2026-em-junho/"
    );

    expect(parsed.baseDate).toBe("2026-06-01");
    expect(parsed.publicationDate).toBe("2026-07-01");
    expect(parsed.records[0]).toMatchObject({
      taxRelief: false,
      totalCost: 2221.44,
      monthlyChangeRate: 0.0224,
      yearChangeRate: 0.0459,
      twelveMonthChangeRate: 0.065
    });
    expect(parsed.records[1]).toMatchObject({
      taxRelief: true,
      totalCost: 2146.08,
      laborCost: 1192.01,
      materialsCost: 892.29,
      administrativeCost: 61.78
    });
    expect(parsed.records[0].sourceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(parsed.records[1].sourceSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("recusa domínio não oficial e publicação sem data-base comprovada", () => {
    expect(() => parseSindusconCubPublication(article, "https://example.com/cub")).toThrow(/domínio oficial/);
    expect(() => parseSindusconCubPublication(
      article.replaceAll("junho de 2026", "período atual"),
      "https://sindusconsp.com.br/cub-invalido/"
    )).toThrow(/data-base/);
  });
});
