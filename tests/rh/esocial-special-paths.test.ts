import { describe, expect, it } from "vitest";
import { buildS2200TransitionClt } from "@/lib/rh/integrations/esocial-worker-transition-xml";
import { buildS2230 } from "@/lib/rh/integrations/esocial-leave-xml";
import { buildS2299, buildS2399 } from "@/lib/rh/integrations/esocial-termination-xml";
import { validateWithOfficialEsocialXsd } from "./esocial-official-xsd";

const employer = { environment: "RESTRICTED" as const, employerType: 1 as const, employerNumber: "12345678000199" };
const baseWorker = {
  ...employer,
  cpf: "12345678901",
  fullName: "Trabalhador Transição",
  sex: "M" as const,
  raceColor: 3 as const,
  maritalStatus: 1 as const,
  educationLevel: "07",
  birthDate: "1990-01-01",
  birthCountryCode: "105",
  nationalityCountryCode: "105",
  address: { streetType: "R", street: "Rua Teste", number: "100", neighborhood: "Centro", postalCode: "12000000", cityIbgeCode: "3554102", state: "SP" },
  registrationNumber: "MAT-NOVA",
  workRegimeType: 1 as const,
  socialSecurityRegimeType: 1 as const,
  workRegimeJourney: 1 as const,
  activityNature: 1 as const,
  unionBaseMonth: 5,
  unionTaxId: "22345678000188",
  categoryCode: "101",
  positionName: "Mestre de obras",
  cboCode: "710205",
  salary: 7000,
  salaryUnit: 5 as const,
  contractType: 1 as const,
  establishmentType: 1 as const,
  establishmentNumber: "12345678000199",
  weeklyHours: 44,
  journeyType: 9 as const,
  partialTimeType: 0 as const,
  nightWork: "N" as const,
  journeyDescription: "Segunda a sexta 08:00-17:00",
  originalAdmissionDate: "2020-02-03"
};
const severanceLine = { lineCode: "SALARY_BALANCE", amount: 2500, rubricCode: "SALDO", tableCode: "1", establishmentType: 1 as const, establishmentNumber: "12345678000199", lotacaoCode: "ADM" };
const validReceipt = "1.2.0000000000000000001";
function official(xml: string, label: string) { validateWithOfficialEsocialXsd(xml, label); return xml; }

describe("eSocial special paths", () => {
  it("gera S-2200 de transferência/sucessão", () => {
    const xml = official(buildS2200TransitionClt({
      ...baseWorker,
      admissionType: 4,
      admissionIndicator: 1,
      succession: { registrationType: 1, registrationNumber: "99888777000166", previousRegistration: "MAT-ANTIGA", transferDate: "2026-08-01", observation: "Sucessão empresarial" }
    }), "S-2200-sucessao");
    expect(xml).toContain("<tpAdmissao>4</tpAdmissao>");
    expect(xml).toContain("<sucessaoVinc>");
    expect(xml).toContain("<matricAnt>MAT-ANTIGA</matricAnt>");
    expect(xml).toContain("<dtTransf>2026-08-01</dtTransf>");
  });

  it("gera S-2200 de mudança de CPF decorrente de decisão judicial", () => {
    const xml = official(buildS2200TransitionClt({
      ...baseWorker,
      cpf: "98765432100",
      registrationNumber: "MAT-NOVO-CPF",
      admissionType: 6,
      admissionIndicator: 3,
      judicialProcessNumber: "12345678901234567890",
      cpfChange: { previousCpf: "12345678901", previousRegistration: "MAT-ANTIGA", changeDate: "2026-08-02", observation: "Alteração cadastral do CPF" }
    }), "S-2200-mudanca-cpf");
    expect(xml).toContain("<tpAdmissao>6</tpAdmissao>");
    expect(xml).toContain("<indAdmissao>3</indAdmissao>");
    expect(xml).toContain("<nrProcTrab>12345678901234567890</nrProcTrab>");
    expect(xml).toContain("<mudancaCPF><cpfAnt>12345678901</cpfAnt>");
  });

  it("gera S-2230 com cessão, mandato sindical, mandato eletivo e retificação", () => {
    const cession = official(buildS2230({ ...employer, cpf: "12345678901", registrationNumber: "MAT001", mode: "START", startDate: "2026-08-01", reasonCode: "14", cession: { cnpj: "99888777000166", burden: 1 } }), "S-2230-cessao");
    expect(cession).toContain("<infoCessao>");
    const union = official(buildS2230({ ...employer, cpf: "12345678901", registrationNumber: "MAT001", mode: "START", startDate: "2026-08-01", reasonCode: "24", unionMandate: { cnpj: "99888777000166", remunerationBurden: 2 } }), "S-2230-mandato-sindical");
    expect(union).toContain("<infoMandSind>");
    const elective = official(buildS2230({ ...employer, cpf: "12345678901", registrationNumber: "MAT001", mode: "START", startDate: "2026-08-01", reasonCode: "22", electiveMandate: { cnpj: "99888777000166", electedPositionRemuneration: "N" } }), "S-2230-mandato-eletivo");
    expect(elective).toContain("<infoMandElet>");
    const rectified = official(buildS2230({ ...employer, cpf: "12345678901", registrationNumber: "MAT001", mode: "START", startDate: "2026-08-01", reasonCode: "03", receipt: validReceipt, rectification: { previousReasonCode: "01", origin: 2, processType: 2, processNumber: "12345678901234567890" } }), "S-2230-retificacao");
    expect(rectified).toContain("<infoRetif>");
  });

  it("gera S-2299 com sucessão, mudança de CPF e remuneração pós-desligamento nos caminhos próprios", () => {
    const succession = official(buildS2299({ ...employer, cpf: "12345678901", registrationNumber: "MAT001", reasonCode: "37", terminationDate: "2026-08-20", noticeIndemnified: false, successor: { registrationType: 1, registrationNumber: "99888777000166" }, lines: [severanceLine], demonstrativeId: "RES001" }), "S-2299-sucessao");
    expect(succession).toContain("<sucessaoVinc>");
    const cpfChange = official(buildS2299({ ...employer, cpf: "12345678901", registrationNumber: "MAT001", reasonCode: "36", terminationDate: "2026-08-20", noticeIndemnified: false, newCpf: "98765432100" }), "S-2299-mudanca-cpf");
    expect(cpfChange).toContain("<mudancaCPF>");
    const post = official(buildS2299({ ...employer, cpf: "12345678901", registrationNumber: "MAT001", reasonCode: "01", terminationDate: "2026-08-20", noticeIndemnified: false, postTerminationRemuneration: { indicator: 1, endDate: "2026-10-31" }, lines: [severanceLine], demonstrativeId: "RES002" }), "S-2299-remun-pos");
    expect(post).toContain("<remunAposDeslig>");
  });

  it("gera S-2399 de mudança de CPF", () => {
    const xml = official(buildS2399({ ...employer, cpf: "12345678901", categoryCode: "721", registrationNumber: "TSV001", terminationDate: "2026-08-20", reasonCode: "07", newCpf: "98765432100" }), "S-2399-mudanca-cpf");
    expect(xml).toContain("<mudancaCPF><novoCPF>98765432100</novoCPF></mudancaCPF>");
  });
});
