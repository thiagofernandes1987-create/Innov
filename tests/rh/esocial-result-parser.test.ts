import { describe, expect, it } from "vitest";
import { parseEsocialIndividualResults } from "@/lib/rh/integrations/esocial-result-parser";

describe("parseEsocialIndividualResults", () => {
  it("interpreta evento aceito com recibo", () => {
    const xml = `<retorno><evento Id="ID100"><eSocial><retornoEvento><ideEmpregador><tpInsc>1</tpInsc></ideEmpregador><processamento><cdResposta>201</cdResposta><descResposta>Sucesso.</descResposta></processamento><recibo><nrRecibo>1.2.0000000000001234567</nrRecibo></recibo></retornoEvento></eSocial></evento></retorno>`;
    expect(parseEsocialIndividualResults(xml)).toEqual([
      expect.objectContaining({
        eventId: "ID100",
        responseCode: "201",
        responseDescription: "Sucesso.",
        receiptNumber: "1.2.0000000000001234567",
        status: "ACCEPTED",
        occurrences: []
      })
    ]);
  });

  it("interpreta rejeição e ocorrências", () => {
    const xml = `<retorno><evento Id="ID200"><eSocial><retornoEvento><processamento><cdResposta>401</cdResposta><descResposta>Conteúdo inválido.</descResposta><ocorrencias><ocorrencia><tipo>1</tipo><codigo>123</codigo><descricao>Rubrica inexistente.</descricao><localizacao>/eSocial/evtRemun</localizacao></ocorrencia></ocorrencias></processamento></retornoEvento></eSocial></evento></retorno>`;
    const [result] = parseEsocialIndividualResults(xml);
    expect(result).toMatchObject({ eventId: "ID200", status: "REJECTED", responseCode: "401", responseDescription: "Conteúdo inválido." });
    expect(result.occurrences).toEqual([{ code: "123", description: "Rubrica inexistente.", type: "1", location: "/eSocial/evtRemun" }]);
  });

  it("tolera prefixos de namespace", () => {
    const xml = `<ret:eventos><ret:evento Id="ID300"><ret:eSocial><ret:retornoEvento><ret:processamento><ret:cdResposta>101</ret:cdResposta><ret:descResposta>Em processamento.</ret:descResposta></ret:processamento></ret:retornoEvento></ret:eSocial></ret:evento></ret:eventos>`;
    expect(parseEsocialIndividualResults(xml)).toEqual([
      expect.objectContaining({ eventId: "ID300", status: "PROCESSING", responseCode: "101", responseDescription: "Em processamento." })
    ]);
  });

  it("tolera XML de retorno escapado dentro do SOAP", () => {
    const embedded = `&lt;retorno&gt;&lt;evento Id=&quot;ID400&quot;&gt;&lt;eSocial&gt;&lt;retornoEvento&gt;&lt;processamento&gt;&lt;cdResposta&gt;201&lt;/cdResposta&gt;&lt;descResposta&gt;Sucesso&lt;/descResposta&gt;&lt;/processamento&gt;&lt;recibo&gt;&lt;nrRecibo&gt;REC400&lt;/nrRecibo&gt;&lt;/recibo&gt;&lt;/retornoEvento&gt;&lt;/eSocial&gt;&lt;/evento&gt;&lt;/retorno&gt;`;
    expect(parseEsocialIndividualResults(`<soap><resultado>${embedded}</resultado></soap>`)).toEqual([
      expect.objectContaining({ eventId: "ID400", status: "ACCEPTED", receiptNumber: "REC400" })
    ]);
  });

  it("retorna vários eventos e mantém a ocorrência mais recente por Id duplicado", () => {
    const xml = `<retorno>
      <evento Id="ID500"><eSocial><retornoEvento><processamento><cdResposta>101</cdResposta></processamento></retornoEvento></eSocial></evento>
      <evento Id="ID600"><eSocial><retornoEvento><processamento><cdResposta>401</cdResposta></processamento></retornoEvento></eSocial></evento>
      <evento Id="ID500"><eSocial><retornoEvento><processamento><cdResposta>201</cdResposta></processamento><recibo><nrRecibo>REC500</nrRecibo></recibo></retornoEvento></eSocial></evento>
    </retorno>`;
    const result = parseEsocialIndividualResults(xml);
    expect(result).toHaveLength(2);
    expect(result.find(item => item.eventId === "ID500")).toMatchObject({ status: "ACCEPTED", receiptNumber: "REC500" });
    expect(result.find(item => item.eventId === "ID600")).toMatchObject({ status: "REJECTED", responseCode: "401" });
  });
});
