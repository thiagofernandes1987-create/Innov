import { describe, expect, it } from "vitest";
import { buildS2300Special } from "@/lib/rh/integrations/esocial-tsv-special-xml";
import { validateWithOfficialEsocialXsd } from "./esocial-official-xsd";

const base = {
  environment: "RESTRICTED" as const,
  employerType: 1 as const,
  employerNumber: "12345678000199",
  cpf: "12345678901",
  fullName: "Trabalhador Especial Teste",
  sex: "M" as const,
  raceColor: 3 as const,
  maritalStatus: 1 as const,
  educationLevel: "09",
  birthDate: "1980-01-01",
  birthCountryCode: "105",
  nationalityCountryCode: "105",
  address: {
    streetType: "R",
    street: "Rua Teste",
    number: "100",
    neighborhood: "Centro",
    postalCode: "12000000",
    cityIbgeCode: "3554102",
    state: "SP"
  },
  phone: "12999999999",
  email: "especial@example.com",
  registrationNumber: "TSVESP001",
  startDate: "2026-08-01",
  position: { positionName: "Analista de gestão", positionCbo: "252105" },
  remuneration: { amount: 8000, unit: 5 as const },
  establishmentType: 1 as const,
  establishmentNumber: "12345678000199"
};

describe("S-2300 grupos especiais do serviço público/sindical", () => {
  it("gera categoria 401 com infoDirigenteSindical e valida no XSD oficial", () => {
    const xml = buildS2300Special({
      ...base,
      categoryCode: "401",
      activityNature: 1,
      unionLeader: {
        originCategory: "101",
        originRegistrationType: 1,
        originRegistrationNumber: "22345678000188",
        originAdmissionDate: "2020-01-02",
        originRegistration: "MAT-ORIG-001",
        workRegime: 1,
        socialSecurityRegime: 1
      }
    });
    validateWithOfficialEsocialXsd(xml, "S-2300-401");
    expect(xml).toContain("<codCateg>401</codCateg>");
    expect(xml).toContain("<infoDirigenteSindical>");
    expect(xml).toContain("<categOrig>101</categOrig>");
  });

  it("gera categoria 305 com infoTrabCedido/RPPS e valida no XSD oficial", () => {
    const xml = buildS2300Special({
      ...base,
      cpf: "12345678902",
      registrationNumber: "TSVESP305",
      categoryCode: "305",
      cededWorker: {
        originCategory: "301",
        cedentCnpj: "22345678000188",
        cedentRegistration: "CED-305-001",
        cedentAdmissionDate: "2018-03-01",
        workRegime: 2,
        socialSecurityRegime: 2
      }
    });
    validateWithOfficialEsocialXsd(xml, "S-2300-305");
    expect(xml).toContain("<codCateg>305</codCateg>");
    expect(xml).toContain("<infoTrabCedido>");
    expect(xml).toContain("<tpRegPrev>2</tpRegPrev>");
  });

  it("gera categoria 410 com infoTrabCedido e valida no XSD oficial", () => {
    const xml = buildS2300Special({
      ...base,
      cpf: "12345678903",
      registrationNumber: "TSVESP410",
      categoryCode: "410",
      position: { functionName: "Assessor técnico", functionCbo: "252205" },
      cededWorker: {
        originCategory: "101",
        cedentCnpj: "22345678000188",
        cedentRegistration: "CED-410-001",
        cedentAdmissionDate: "2019-04-01",
        workRegime: 1,
        socialSecurityRegime: 1
      }
    });
    validateWithOfficialEsocialXsd(xml, "S-2300-410");
    expect(xml).toContain("<codCateg>410</codCateg>");
    expect(xml).toContain("<nmFuncao>Assessor técnico</nmFuncao>");
    expect(xml).toContain("<infoTrabCedido>");
  });

  it("gera categoria 304 com infoMandElet e valida no XSD oficial", () => {
    const xml = buildS2300Special({
      ...base,
      cpf: "12345678904",
      registrationNumber: "TSVESP304",
      categoryCode: "304",
      position: { positionName: "Vereador", positionCbo: "111120" },
      electiveMandate: {
        originCategory: "301",
        originCnpj: "22345678000188",
        originRegistration: "MAND-ORIG-001",
        originExerciseDate: "2020-01-01",
        keepOriginRemuneration: "N",
        workRegime: 2,
        socialSecurityRegime: 2
      }
    });
    validateWithOfficialEsocialXsd(xml, "S-2300-304");
    expect(xml).toContain("<codCateg>304</codCateg>");
    expect(xml).toContain("<infoMandElet>");
    expect(xml).toContain("<indRemunCargo>N</indRemunCargo>");
  });

  it("bloqueia dirigente sindical sem origem", () => {
    expect(() => buildS2300Special({ ...base, categoryCode: "401", activityNature: 1 })).toThrow(/infoDirigenteSindical/);
  });

  it("bloqueia categoria 305 fora do RPPS", () => {
    expect(() => buildS2300Special({
      ...base,
      categoryCode: "305",
      cededWorker: {
        originCategory: "301",
        cedentCnpj: "22345678000188",
        cedentRegistration: "CED-ERR",
        cedentAdmissionDate: "2018-03-01",
        workRegime: 2,
        socialSecurityRegime: 1
      }
    })).toThrow(/Categoria 305 exige regime previdenciário 2/);
  });

  it("bloqueia CNPJ de cedente pertencente à mesma raiz do declarante", () => {
    expect(() => buildS2300Special({
      ...base,
      categoryCode: "410",
      cededWorker: {
        originCategory: "101",
        cedentCnpj: "12345678000270",
        cedentRegistration: "CED-MESMA-RAIZ",
        cedentAdmissionDate: "2019-04-01",
        workRegime: 1,
        socialSecurityRegime: 1
      }
    })).toThrow(/CNPJ do cedente deve ser diferente/);
  });

  it("bloqueia mandato político sem indicador de remuneração do cargo", () => {
    expect(() => buildS2300Special({
      ...base,
      categoryCode: "304",
      position: { positionName: "Vereador", positionCbo: "111120" },
      electiveMandate: {
        originCategory: "301",
        originCnpj: "22345678000188",
        originRegistration: "MAND-ERR",
        originExerciseDate: "2020-01-01",
        workRegime: 2,
        socialSecurityRegime: 2
      }
    })).toThrow(/indRemunCargo/);
  });
});
