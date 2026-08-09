import { makeEsocialEventId, normalizeEmployerRegistrationNumber, type EsocialEnvironment } from "./esocial-xml";

const LAYOUT = "v_S_01_03_00";
const VER_PROC = process.env.ESOCIAL_PROCESS_VERSION?.trim() || "Innovar-RH/0.1";

function escapeXml(value: unknown) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
function tag(name: string, value: unknown) { return `<${name}>${escapeXml(value)}</${name}>`; }
function opt(name: string, value: unknown) { return value === null || value === undefined || value === "" ? "" : tag(name, value); }
function digits(value: string) { return value.replace(/\D/g, ""); }
function tpAmb(environment: EsocialEnvironment) { return environment === "PRODUCTION" ? 1 : 2; }
function ideEvento(environment: EsocialEnvironment, receipt?: string | null) {
  return `<ideEvento>${tag("indRetif", receipt ? 2 : 1)}${receipt ? tag("nrRecibo", receipt) : ""}${tag("tpAmb", tpAmb(environment))}${tag("procEmi", 1)}${tag("verProc", VER_PROC)}</ideEvento>`;
}
function ideEmpregador(type: 1 | 2, number: string) {
  return `<ideEmpregador>${tag("tpInsc", type)}${tag("nrInsc", normalizeEmployerRegistrationNumber(type, number))}</ideEmpregador>`;
}
function cpf(value: string, label = "CPF") {
  const normalized = digits(value);
  if (normalized.length !== 11) throw new Error(`${label} deve possuir 11 dígitos.`);
  return normalized;
}
function cnpj(value: string, label = "CNPJ") {
  const normalized = digits(value);
  if (normalized.length !== 14) throw new Error(`${label} deve possuir 14 dígitos.`);
  return normalized;
}

export type S2300StudentCategory = "901" | "906";
export type S2300StudentAddress = { streetType?: string | null; street: string; number: string; complement?: string | null; neighborhood?: string | null; postalCode: string; cityIbgeCode: string; state: string };
export type S2300StudentImmigrant = { residenceTerm: 1 | 2; entryCondition: 1 | 2 | 3 | 4 | 5 | 6 | 7 };
export type S2300EducationInstitution =
  | { cnpj: string; name?: never; street?: never; number?: never; neighborhood?: never; postalCode?: never; cityIbgeCode?: never; state?: never }
  | { cnpj?: null; name: string; street: string; number: string; neighborhood: string; postalCode?: string | null; cityIbgeCode?: string | null; state?: string | null };
export type S2300StudentInfo = {
  nature: "O" | "N";
  level?: 1 | 2 | 3 | 4 | 8 | 9 | null;
  area?: string | null;
  policyNumber?: string | null;
  expectedEndDate: string;
  institution: S2300EducationInstitution;
  integrationAgentCnpj?: string | null;
  supervisorCpf?: string | null;
};
export type S2300StudentInput = {
  environment: EsocialEnvironment;
  employerType: 1 | 2;
  employerNumber: string;
  cpf: string;
  fullName: string;
  sex: "M" | "F";
  raceColor: 1 | 2 | 3 | 4 | 5;
  maritalStatus?: 1 | 2 | 3 | 4 | 5 | null;
  educationLevel: string;
  birthDate: string;
  birthCountryCode: string;
  nationalityCountryCode: string;
  address: S2300StudentAddress;
  phone?: string | null;
  email?: string | null;
  immigrant?: S2300StudentImmigrant | null;
  registrationNumber: string;
  categoryCode: S2300StudentCategory;
  startDate: string;
  judicialProcessNumber?: string | null;
  positionName?: string | null;
  cboCode?: string | null;
  salary?: number | null;
  salaryUnit?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null;
  variableSalaryDescription?: string | null;
  establishmentType: 1 | 3 | 4;
  establishmentNumber: string;
  student: S2300StudentInfo;
  receipt?: string | null;
  eventKey?: string;
};

function immigrantXml(input: S2300StudentInput) {
  if (input.nationalityCountryCode === "105") {
    if (input.immigrant) throw new Error("TSVE brasileiro não deve informar trabImig.");
    return "";
  }
  if (!input.immigrant) throw new Error("TSVE imigrante exige tmpResid e condIng.");
  if (input.immigrant.residenceTerm === 1 && [2, 5].includes(input.immigrant.entryCondition)) throw new Error("condIng incompatível com residência indeterminada.");
  if (input.immigrant.residenceTerm === 2 && input.immigrant.entryCondition === 1) throw new Error("condIng incompatível com residência determinada.");
  return `<trabImig>${tag("tmpResid", input.immigrant.residenceTerm)}${tag("condIng", input.immigrant.entryCondition)}</trabImig>`;
}

function institutionXml(institution: S2300EducationInstitution) {
  if (institution.cnpj) return `<instEnsino>${tag("cnpjInstEnsino", cnpj(institution.cnpj, "CNPJ da instituição de ensino"))}</instEnsino>`;
  if (!institution.name.trim() || !institution.street.trim() || !institution.number.trim() || !institution.neighborhood.trim()) throw new Error("Instituição sem CNPJ exige razão social e endereço completos.");
  const postal = institution.postalCode ? digits(institution.postalCode) : "";
  const city = institution.cityIbgeCode ? digits(institution.cityIbgeCode) : "";
  if (postal && postal.length !== 8) throw new Error("CEP da instituição deve possuir 8 dígitos.");
  if (city && city.length !== 7) throw new Error("Código IBGE da instituição deve possuir 7 dígitos.");
  return `<instEnsino>${tag("nmRazao", institution.name)}${tag("dscLograd", institution.street)}${tag("nrLograd", institution.number)}${tag("bairro", institution.neighborhood)}${opt("cep", postal || null)}${opt("codMunic", city || null)}${opt("uf", institution.state)}</instEnsino>`;
}

function studentXml(input: S2300StudentInput) {
  const info = input.student;
  if (input.categoryCode === "901" && !info.level) throw new Error("Categoria 901 exige nível do estágio.");
  if (input.categoryCode === "906" && info.nature !== "N") throw new Error("Categoria 906 exige natEstagio=N.");
  if (input.categoryCode === "906" && info.level === 9) throw new Error("Categoria 906 não admite nível 9.");
  if (input.student.expectedEndDate <= input.startDate) throw new Error("Data prevista de término deve ser posterior ao início.");
  if (input.categoryCode === "906" && (info.integrationAgentCnpj || info.supervisorCpf)) throw new Error("Categoria 906 não admite agente de integração ou supervisor de estágio.");
  const agent = info.integrationAgentCnpj ? `<ageIntegracao>${tag("cnpjAgntInteg", cnpj(info.integrationAgentCnpj, "CNPJ do agente de integração"))}</ageIntegracao>` : "";
  const supervisor = info.supervisorCpf ? `<supervisorEstagio>${tag("cpfSupervisor", cpf(info.supervisorCpf, "CPF do supervisor"))}</supervisorEstagio>` : "";
  return `<infoEstagiario>${tag("natEstagio", info.nature)}${opt("nivEstagio", info.level)}${opt("areaAtuacao", info.area)}${opt("nrApol", info.policyNumber)}${tag("dtPrevTerm", info.expectedEndDate)}${institutionXml(info.institution)}${agent}${supervisor}</infoEstagiario>`;
}

function localXml(input: S2300StudentInput) {
  if (input.startDate < "2024-01-22") return "";
  const registration = digits(input.establishmentNumber);
  if (input.establishmentType === 1 && registration.length !== 14) throw new Error("Local CNPJ exige 14 dígitos.");
  if ([3, 4].includes(input.establishmentType) && registration.length !== 12) throw new Error("Local CAEPF/CNO exige 12 dígitos.");
  return `<localTrabGeral>${tag("tpInsc", input.establishmentType)}${tag("nrInsc", registration)}</localTrabGeral>`;
}

export function buildS2300Student(input: S2300StudentInput) {
  const eventKey = input.eventKey ?? makeEsocialEventId(input.employerType, input.employerNumber);
  const workerCpf = cpf(input.cpf, "CPF do TSVE");
  if (!/^\d{8}$/.test(digits(input.address.postalCode)) || !/^\d{7}$/.test(digits(input.address.cityIbgeCode))) throw new Error("S-2300 exige CEP e código IBGE em formato válido.");
  if (input.judicialProcessNumber && digits(input.judicialProcessNumber).length !== 20) throw new Error("Processo judicial do S-2300 deve ter 20 dígitos.");
  if (input.cboCode && !/^\d{6}$/.test(digits(input.cboCode))) throw new Error("CBO deve possuir 6 dígitos.");
  if (input.categoryCode === "906" && (input.salary === null || input.salary === undefined || !input.salaryUnit)) throw new Error("Categoria 906 exige remuneração.");
  if (input.salaryUnit && [6, 7].includes(input.salaryUnit) && !input.variableSalaryDescription?.trim()) throw new Error("Remuneração por tarefa/variável exige descrição.");

  const trabalhador = `<trabalhador>${tag("cpfTrab", workerCpf)}${tag("nmTrab", input.fullName)}${tag("sexo", input.sex)}${tag("racaCor", input.raceColor)}${opt("estCiv", input.maritalStatus)}${tag("grauInstr", input.educationLevel)}<nascimento>${tag("dtNascto", input.birthDate)}${tag("paisNascto", input.birthCountryCode)}${tag("paisNac", input.nationalityCountryCode)}</nascimento><endereco><brasil>${opt("tpLograd", input.address.streetType)}${tag("dscLograd", input.address.street)}${tag("nrLograd", input.address.number)}${opt("complemento", input.address.complement)}${opt("bairro", input.address.neighborhood)}${tag("cep", digits(input.address.postalCode))}${tag("codMunic", digits(input.address.cityIbgeCode))}${tag("uf", input.address.state)}</brasil></endereco>${immigrantXml(input)}${input.phone || input.email ? `<contato>${opt("fonePrinc", input.phone ? digits(input.phone) : null)}${opt("emailPrinc", input.email)}</contato>` : ""}</trabalhador>`;
  const cargo = input.positionName && input.cboCode ? `<cargoFuncao>${tag("nmCargo", input.positionName)}${tag("CBOCargo", digits(input.cboCode))}</cargoFuncao>` : "";
  const remuneration = input.salary !== null && input.salary !== undefined && input.salaryUnit ? `<remuneracao>${tag("vrSalFx", Number(input.salary).toFixed(2))}${tag("undSalFixo", input.salaryUnit)}${opt("dscSalVar", input.variableSalaryDescription)}</remuneracao>` : "";
  const complement = `<infoComplementares>${cargo}${remuneration}${studentXml(input)}${localXml(input)}</infoComplementares>`;
  const info = `<infoTSVInicio>${tag("cadIni", "N")}${tag("matricula", input.registrationNumber)}${tag("codCateg", input.categoryCode)}${tag("dtInicio", input.startDate)}${opt("nrProcTrab", input.judicialProcessNumber ? digits(input.judicialProcessNumber) : null)}${complement}</infoTSVInicio>`;
  return `<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtTSVInicio/${LAYOUT}"><evtTSVInicio Id="${escapeXml(eventKey)}">${ideEvento(input.environment, input.receipt)}${ideEmpregador(input.employerType, input.employerNumber)}${trabalhador}${info}</evtTSVInicio></eSocial>`;
}
