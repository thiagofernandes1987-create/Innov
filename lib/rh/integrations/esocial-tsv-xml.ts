import { makeEsocialEventId, normalizeEmployerRegistrationNumber, type EsocialEnvironment } from "./esocial-xml";

const LAYOUT = "v_S_01_03_00";
const VER_PROC = process.env.ESOCIAL_PROCESS_VERSION?.trim() || "Innovar-RH/0.1";

export const S2300_CONTRIBUTOR_CATEGORIES = [
  "701", "711", "712", "721", "722", "723", "731", "734", "738", "741", "751", "761", "771", "781"
] as const;
export type S2300ContributorCategory = (typeof S2300_CONTRIBUTOR_CATEGORIES)[number];

const LOCAL_REQUIRED = new Set<S2300ContributorCategory>(["721", "722", "723", "731", "734", "738", "761", "771"]);
const REMUNERATION_REQUIRED = new Set<S2300ContributorCategory>(["721", "722", "771"]);

function x(value: unknown) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
function tag(name: string, value: unknown) { return `<${name}>${x(value)}</${name}>`; }
function opt(name: string, value: unknown) { return value === null || value === undefined || value === "" ? "" : tag(name, value); }
function digits(value: string) { return value.replace(/\D/g, ""); }
function tpAmb(environment: EsocialEnvironment) { return environment === "PRODUCTION" ? 1 : 2; }
function ideEvento(environment: EsocialEnvironment, receipt?: string | null) {
  return `<ideEvento>${tag("indRetif", receipt ? 2 : 1)}${receipt ? tag("nrRecibo", receipt) : ""}${tag("tpAmb", tpAmb(environment))}${tag("procEmi", 1)}${tag("verProc", VER_PROC)}</ideEvento>`;
}
function ideEmpregador(type: 1 | 2, number: string) {
  return `<ideEmpregador>${tag("tpInsc", type)}${tag("nrInsc", normalizeEmployerRegistrationNumber(type, number))}</ideEmpregador>`;
}
function cpf(value: string) {
  const normalized = digits(value);
  if (normalized.length !== 11) throw new Error("S-2300 exige CPF com 11 dígitos.");
  return normalized;
}

export type S2300BrazilAddress = {
  streetType?: string | null;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood?: string | null;
  postalCode: string;
  cityIbgeCode: string;
  state: string;
};
export type S2300Immigrant = { residenceTerm: 1 | 2; entryCondition: 1 | 2 | 3 | 4 | 5 | 6 | 7 };

export type S2300ContributorInput = {
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
  address: S2300BrazilAddress;
  phone?: string | null;
  email?: string | null;
  immigrant?: S2300Immigrant | null;
  registrationNumber: string;
  categoryCode: S2300ContributorCategory;
  startDate: string;
  judicialProcessNumber?: string | null;
  positionName: string;
  cboCode: string;
  salary: number;
  salaryUnit: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  variableSalaryDescription?: string | null;
  fgtsOptionDate?: string | null;
  establishmentType: 1 | 3 | 4;
  establishmentNumber: string;
  receipt?: string | null;
  eventKey?: string;
};

export type S2300Standard721Input = Omit<S2300ContributorInput, "categoryCode" | "fgtsOptionDate"> & { fgtsOptionDate: string };

function immigrantXml(input: S2300ContributorInput) {
  if (input.nationalityCountryCode === "105") {
    if (input.immigrant) throw new Error("TSVE brasileiro não deve informar trabImig.");
    return "";
  }
  if (!input.immigrant) throw new Error("TSVE imigrante exige tmpResid e condIng.");
  if (input.immigrant.residenceTerm === 1 && [2, 5].includes(input.immigrant.entryCondition)) throw new Error("condIng incompatível com residência indeterminada.");
  if (input.immigrant.residenceTerm === 2 && input.immigrant.entryCondition === 1) throw new Error("condIng incompatível com residência determinada.");
  return `<trabImig>${tag("tmpResid", input.immigrant.residenceTerm)}${tag("condIng", input.immigrant.entryCondition)}</trabImig>`;
}

function localXml(input: S2300ContributorInput) {
  if (!LOCAL_REQUIRED.has(input.categoryCode)) return "";
  const registration = digits(input.establishmentNumber);
  if (input.establishmentType === 1 && registration.length !== 14) throw new Error("Local CNPJ exige 14 dígitos.");
  if ([3, 4].includes(input.establishmentType) && registration.length !== 12) throw new Error("Local CAEPF/CNO exige 12 dígitos.");
  return `<localTrabGeral>${tag("tpInsc", input.establishmentType)}${tag("nrInsc", registration)}</localTrabGeral>`;
}

export function buildS2300Contributor(input: S2300ContributorInput) {
  if (!S2300_CONTRIBUTOR_CATEGORIES.includes(input.categoryCode)) throw new Error("Categoria de contribuinte individual não suportada pelo gerador S-2300.");
  const eventKey = input.eventKey ?? makeEsocialEventId(input.employerType, input.employerNumber);
  const workerCpf = cpf(input.cpf);
  if (!/^\d{6}$/.test(digits(input.cboCode))) throw new Error("S-2300 de contribuinte individual exige CBO com 6 dígitos.");
  if (!/^\d{8}$/.test(digits(input.address.postalCode)) || !/^\d{7}$/.test(digits(input.address.cityIbgeCode))) throw new Error("S-2300 exige CEP e código IBGE em formato válido.");
  if (input.judicialProcessNumber && digits(input.judicialProcessNumber).length !== 20) throw new Error("Processo judicial do S-2300 deve ter 20 dígitos.");
  if ([6, 7].includes(input.salaryUnit) && !input.variableSalaryDescription?.trim()) throw new Error("Remuneração por tarefa/variável exige descrição.");
  if (input.categoryCode === "721" && !input.fgtsOptionDate) throw new Error("Categoria 721 exige data de opção pelo FGTS.");
  if (input.categoryCode !== "721" && input.fgtsOptionDate) throw new Error("FGTS no S-2300 é exclusivo da categoria 721 neste grupo.");

  const trabalhador = `<trabalhador>${tag("cpfTrab", workerCpf)}${tag("nmTrab", input.fullName)}${tag("sexo", input.sex)}${tag("racaCor", input.raceColor)}${opt("estCiv", input.maritalStatus)}${tag("grauInstr", input.educationLevel)}<nascimento>${tag("dtNascto", input.birthDate)}${tag("paisNascto", input.birthCountryCode)}${tag("paisNac", input.nationalityCountryCode)}</nascimento><endereco><brasil>${opt("tpLograd", input.address.streetType)}${tag("dscLograd", input.address.street)}${tag("nrLograd", input.address.number)}${opt("complemento", input.address.complement)}${opt("bairro", input.address.neighborhood)}${tag("cep", digits(input.address.postalCode))}${tag("codMunic", digits(input.address.cityIbgeCode))}${tag("uf", input.address.state)}</brasil></endereco>${immigrantXml(input)}${input.phone || input.email ? `<contato>${opt("fonePrinc", input.phone ? digits(input.phone) : null)}${opt("emailPrinc", input.email)}</contato>` : ""}</trabalhador>`;
  const cargo = `<cargoFuncao>${tag("nmCargo", input.positionName)}${tag("CBOCargo", digits(input.cboCode))}</cargoFuncao>`;
  const remuneration = `<remuneracao>${tag("vrSalFx", Number(input.salary).toFixed(2))}${tag("undSalFixo", input.salaryUnit)}${opt("dscSalVar", input.variableSalaryDescription)}</remuneracao>`;
  if (REMUNERATION_REQUIRED.has(input.categoryCode) && !Number.isFinite(input.salary)) throw new Error(`Categoria ${input.categoryCode} exige remuneração.`);
  const fgts = input.categoryCode === "721" ? `<FGTS>${tag("dtOpcFGTS", input.fgtsOptionDate)}</FGTS>` : "";
  const complement = `<infoComplementares>${cargo}${remuneration}${fgts}${localXml(input)}</infoComplementares>`;
  const info = `<infoTSVInicio>${tag("cadIni", "N")}${tag("matricula", input.registrationNumber)}${tag("codCateg", input.categoryCode)}${tag("dtInicio", input.startDate)}${opt("nrProcTrab", input.judicialProcessNumber ? digits(input.judicialProcessNumber) : null)}${complement}</infoTSVInicio>`;
  return `<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtTSVInicio/${LAYOUT}"><evtTSVInicio Id="${x(eventKey)}">${ideEvento(input.environment, input.receipt)}${ideEmpregador(input.employerType, input.employerNumber)}${trabalhador}${info}</evtTSVInicio></eSocial>`;
}

export function buildS2300Category721(input: S2300Standard721Input) {
  return buildS2300Contributor({ ...input, categoryCode: "721" });
}
