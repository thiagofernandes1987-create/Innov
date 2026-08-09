import { describe, expect, it } from "vitest";
import {
  buildS2300Category721,
  buildS2300Contributor,
  S2300_CONTRIBUTOR_CATEGORIES,
  type S2300ContributorCategory
} from "@/lib/rh/integrations/esocial-tsv-xml";
import { buildS2300Student } from "@/lib/rh/integrations/esocial-tsv-student-xml";
import { validateWithOfficialEsocialXsd } from "./esocial-official-xsd";

const base = {
  environment: "RESTRICTED" as const,
  employerType: 1 as const,
  employerNumber: "12345678000199",
  cpf: "12345678901",
  fullName: "Contribuinte Teste",
  sex: "M" as const,
  raceColor: 3 as const,
  maritalStatus: 1 as const,
  educationLevel: "09",
  birthDate: "1980-01-01",
  birthCountryCode: "105",
  nationalityCountryCode: "105",
  address: { streetType: "R", street: "Rua Teste", number: "100", neighborhood: "Centro", postalCode: "12000000", cityIbgeCode: "3554102", state: "SP" },
  phone: "12999999999",
  email: "tsv@example.com",
  registrationNumber: "TSV001",
  startDate: "2026-08-01",
  positionName: "Prestador sem vínculo",
  cboCode: "123105",
  salary: 10000,
  salaryUnit: 5 as const,
  establishmentType: 1 as const,
  establishmentNumber: "12345678000199"
};
const localRequired = new Set<S2300ContributorCategory>(["721", "722", "723", "731", "734", "738", "761", "771"]);

describe("S-2300 TSVE contribuinte individual", () => {
  it("preserva compatibilidade do wrapper categoria 721", () => {
    const xml = buildS2300Category721({ ...base, fgtsOptionDate: "2026-08-01" });
    validateWithOfficialEsocialXsd(xml, "S-2300-721");
    expect(xml).toContain("<codCateg>721</codCateg>");
    expect(xml).toContain("<FGTS><dtOpcFGTS>2026-08-01</dtOpcFGTS></FGTS>");
    expect(xml).toContain("<localTrabGeral><tpInsc>1</tpInsc><nrInsc>12345678000199</nrInsc></localTrabGeral>");
  });

  for (const categoryCode of S2300_CONTRIBUTOR_CATEGORIES) {
    it(`gera categoria ${categoryCode} compatível com o XSD oficial`, () => {
      const xml = buildS2300Contributor({ ...base, categoryCode, fgtsOptionDate: categoryCode === "721" ? "2026-08-01" : null });
      validateWithOfficialEsocialXsd(xml, `S-2300-${categoryCode}`);
      expect(xml).toContain(`<codCateg>${categoryCode}</codCateg>`);
      expect(xml.includes("<FGTS>")).toBe(categoryCode === "721");
      expect(xml.includes("<localTrabGeral>")).toBe(localRequired.has(categoryCode));
    });
  }

  it("bloqueia FGTS para categoria diferente de 721", () => {
    expect(() => buildS2300Contributor({ ...base, categoryCode: "722", fgtsOptionDate: "2026-08-01" })).toThrow(/exclusivo da categoria 721/);
  });

  it("exige descrição se remuneração for exclusivamente variável", () => {
    expect(() => buildS2300Contributor({ ...base, categoryCode: "722", salary: 0, salaryUnit: 7 })).toThrow(/descrição/);
  });

  it("gera grupo de imigrante quando nacionalidade não é 105", () => {
    const xml = buildS2300Contributor({ ...base, categoryCode: "723", cpf: "12345678902", fullName: "Contribuinte Imigrante", birthCountryCode: "063", nationalityCountryCode: "063", immigrant: { residenceTerm: 2, entryCondition: 4 } });
    validateWithOfficialEsocialXsd(xml, "S-2300-723-imigrante");
    expect(xml).toContain("<trabImig><tmpResid>2</tmpResid><condIng>4</condIng></trabImig>");
  });
});

describe("S-2300 estágio e serviço civil", () => {
  it("gera categoria 901 com instituição, agente e supervisor", () => {
    const xml = buildS2300Student({
      ...base,
      cpf: "12345678903",
      fullName: "Estagiário Teste",
      registrationNumber: "EST001",
      categoryCode: "901",
      positionName: null,
      cboCode: null,
      salary: null,
      salaryUnit: null,
      student: {
        nature: "N",
        level: 4,
        area: "Engenharia civil",
        policyNumber: "APOLICE-2026-001",
        expectedEndDate: "2027-07-31",
        institution: { cnpj: "22345678000188" },
        integrationAgentCnpj: "33456789000177",
        supervisorCpf: "98765432100"
      }
    });
    validateWithOfficialEsocialXsd(xml, "S-2300-901");
    expect(xml).toContain("<codCateg>901</codCateg>");
    expect(xml).toContain("<infoEstagiario>");
    expect(xml).toContain("<nivEstagio>4</nivEstagio>");
    expect(xml).toContain("<ageIntegracao>");
    expect(xml).toContain("<supervisorEstagio>");
    expect(xml).toContain("<localTrabGeral>");
  });

  it("gera categoria 906 com remuneração e sem agente/supervisor", () => {
    const xml = buildS2300Student({
      ...base,
      cpf: "12345678904",
      fullName: "Serviço Civil Teste",
      registrationNumber: "SCV001",
      categoryCode: "906",
      positionName: null,
      cboCode: null,
      salary: 1800,
      salaryUnit: 5,
      student: {
        nature: "N",
        level: 3,
        area: "40.00",
        expectedEndDate: "2027-01-31",
        institution: { cnpj: "22345678000188" }
      }
    });
    validateWithOfficialEsocialXsd(xml, "S-2300-906");
    expect(xml).toContain("<codCateg>906</codCateg>");
    expect(xml).toContain("<remuneracao><vrSalFx>1800.00</vrSalFx><undSalFixo>5</undSalFixo></remuneracao>");
    expect(xml).toContain("<natEstagio>N</natEstagio>");
    expect(xml).not.toContain("<ageIntegracao>");
    expect(xml).not.toContain("<supervisorEstagio>");
  });

  it("bloqueia nível ausente na categoria 901", () => {
    expect(() => buildS2300Student({
      ...base,
      categoryCode: "901",
      positionName: null,
      cboCode: null,
      salary: null,
      salaryUnit: null,
      student: { nature: "N", expectedEndDate: "2027-07-31", institution: { cnpj: "22345678000188" } }
    })).toThrow(/nível do estágio/);
  });

  it("bloqueia agente/supervisor na categoria 906", () => {
    expect(() => buildS2300Student({
      ...base,
      categoryCode: "906",
      salary: 1800,
      salaryUnit: 5,
      student: { nature: "N", level: 3, expectedEndDate: "2027-01-31", institution: { cnpj: "22345678000188" }, integrationAgentCnpj: "33456789000177" }
    })).toThrow(/não admite agente/);
  });
});
