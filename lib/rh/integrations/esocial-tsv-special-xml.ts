import { makeEsocialEventId, normalizeEmployerRegistrationNumber, type EsocialEnvironment } from "./esocial-xml";

const LAYOUT = "v_S_01_03_00";
const VER_PROC = process.env.ESOCIAL_PROCESS_VERSION?.trim() || "Innovar-RH/0.1";

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
function cbo(value: string, label = "CBO") {
  const normalized = digits(value);
  if (normalized.length !== 6) throw new Error(`${label} deve possuir 6 dígitos.`);
  return normalized;
}

export type S2300SpecialCategory = "304" | "305" | "401" | "410";
export type S2300SpecialAddress = { streetType?: string | null; street: string; number: string; complement?: string | null; neighborhood?: string | null; postalCode: string; cityIbgeCode: string; state: string };
export type S2300SpecialImmigrant = { residenceTerm: 1 | 2; entryCondition: 1 | 2 | 3 | 4 | 5 | 6 | 7 };
export type S2300Position = { positionName?: string | null; positionCbo?: string | null; functionName?: string | null; functionCbo?: string | null };
export type S2300Remuneration = { amount: number; unit: 1 | 2 | 3 | 4 | 5 | 6 | 7; variableDescription?: string | null };
export type UnionLeaderInfo = {
  originCategory: string;
  originRegistrationType?: 1 | 2 | null;
  originRegistrationNumber?: string | null;
  originAdmissionDate?: string | null;
  originRegistration?: string | null;
  workRegime?: 1 | 2 | null;
  socialSecurityRegime: 1 | 2 | 3;
};
export type CededWorkerInfo = {
  originCategory: string;
  cedentCnpj: string;
  cedentRegistration: string;
  cedentAdmissionDate: string;
  workRegime: 1 | 2;
  socialSecurityRegime: 1 | 2 | 3 | 4;
};
export type ElectiveMandateInfo = {
  originCategory: string;
  originCnpj: string;
  originRegistration: string;
  originExerciseDate: string;
  keepOriginRemuneration?: "S" | "N" | null;
  workRegime: 1 | 2;
  socialSecurityRegime: 1 | 2 | 3;
};

export type S2300SpecialInput = {
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
  address: S2300SpecialAddress;
  phone?: string | null;
  email?: string | null;
  immigrant?: S2300SpecialImmigrant | null;
  registrationNumber: string;
  categoryCode: S2300SpecialCategory;
  startDate: string;
  judicialProcessNumber?: string | null;
  activityNature?: 1 | 2 | null;
  position: S2300Position;
  remuneration?: S2300Remuneration | null;
  establishmentType: 1 | 3 | 4;
  establishmentNumber: string;
  unionLeader?: UnionLeaderInfo | null;
  cededWorker?: CededWorkerInfo | null;
  electiveMandate?: ElectiveMandateInfo | null;
  receipt?: string | null;
  eventKey?: string;
};

const EMPLOYEE_CATEGORIES = new Set(["101","102","103","104","105","106","107","108","111"]);
const PUBLIC_CATEGORIES = new Set(["301","302","303","304","305","306","307","308","309","310","311","312","313","314"]);
const AVULSO_CATEGORIES = new Set(["201","202"]);

function immigrantXml(input: S2300SpecialInput) {
  if (input.nationalityCountryCode === "105") {
    if (input.immigrant) throw new Error("TSVE brasileiro não deve informar trabImig.");
    return "";
  }
  if (!input.immigrant) throw new Error("TSVE imigrante exige tmpResid e condIng.");
  if (input.immigrant.residenceTerm === 1 && [2, 5].includes(input.immigrant.entryCondition)) throw new Error("condIng incompatível com residência indeterminada.");
  if (input.immigrant.residenceTerm === 2 && input.immigrant.entryCondition === 1) throw new Error("condIng incompatível com residência determinada.");
  return `<trabImig>${tag("tmpResid", input.immigrant.residenceTerm)}${tag("condIng", input.immigrant.entryCondition)}</trabImig>`;
}

function positionXml(input: S2300SpecialInput) {
  const p = input.position;
  if (input.categoryCode !== "410" && !p.positionName) throw new Error(`Categoria ${input.categoryCode} exige cargo.`);
  if (p.positionName && !p.positionCbo) throw new Error("Cargo exige CBOCargo.");
  if (p.functionName && !p.functionCbo) throw new Error("Função exige CBOFuncao.");
  if (input.categoryCode === "410" && !p.positionName && !p.functionName) throw new Error("Categoria 410 exige cargo ou função.");
  return `<cargoFuncao>${p.positionName ? `${tag("nmCargo", p.positionName)}${tag("CBOCargo", cbo(p.positionCbo ?? "", "CBO do cargo"))}` : ""}${p.functionName ? `${tag("nmFuncao", p.functionName)}${tag("CBOFuncao", cbo(p.functionCbo ?? "", "CBO da função"))}` : ""}</cargoFuncao>`;
}

function remunerationXml(input: S2300SpecialInput) {
  const r = input.remuneration;
  if (!r) return "";
  if ([6, 7].includes(r.unit) && !r.variableDescription?.trim()) throw new Error("Remuneração por tarefa/variável exige descrição.");
  const amount = r.unit === 7 ? 0 : r.amount;
  return `<remuneracao>${tag("vrSalFx", Number(amount).toFixed(2))}${tag("undSalFixo", r.unit)}${opt("dscSalVar", r.variableDescription)}</remuneracao>`;
}

function unionLeaderXml(input: S2300SpecialInput) {
  if (input.categoryCode !== "401") return "";
  const info = input.unionLeader;
  if (!info) throw new Error("Categoria 401 exige infoDirigenteSindical.");
  if (info.originCategory === "401" || !/^\d{3}$/.test(info.originCategory)) throw new Error("Categoria de origem do dirigente sindical inválida.");
  const needsOriginEmployer = EMPLOYEE_CATEGORIES.has(info.originCategory) || PUBLIC_CATEGORIES.has(info.originCategory) || AVULSO_CATEGORIES.has(info.originCategory) || info.originCategory === "721";
  const needsEmployment = EMPLOYEE_CATEGORIES.has(info.originCategory) || PUBLIC_CATEGORIES.has(info.originCategory);
  if (needsOriginEmployer && (!info.originRegistrationType || !info.originRegistrationNumber || !info.originAdmissionDate)) throw new Error("Categoria de origem exige empregador e data de admissão originais.");
  if (!needsOriginEmployer && (info.originRegistrationType || info.originRegistrationNumber || info.originAdmissionDate)) throw new Error("Empregador/data de origem não se aplicam à categoria de origem informada.");
  if (needsEmployment && (!info.originRegistration || !info.workRegime)) throw new Error("Categoria de origem exige matrícula e regime trabalhista originais.");
  if (!needsEmployment && (info.originRegistration || info.workRegime)) throw new Error("Matrícula/regime trabalhista não se aplicam à categoria de origem informada.");
  if (EMPLOYEE_CATEGORIES.has(info.originCategory) && info.socialSecurityRegime === 2) throw new Error("Origem empregado não admite RPPS no dirigente sindical.");
  if (info.originRegistrationType === 1 && digits(info.originRegistrationNumber ?? "").length !== 14) throw new Error("CNPJ de origem deve possuir 14 dígitos.");
  if (info.originRegistrationType === 2 && digits(info.originRegistrationNumber ?? "").length !== 11) throw new Error("CPF de origem deve possuir 11 dígitos.");
  const current = digits(input.employerNumber);
  const origin = digits(info.originRegistrationNumber ?? "");
  if (info.originRegistrationType === 1 && input.employerType === 1 && origin.slice(0,8) === current.slice(0,8)) throw new Error("CNPJ de origem deve ser diferente do declarante.");
  if (info.originRegistrationType === 2 && input.employerType === 2 && origin === current) throw new Error("CPF de origem deve ser diferente do declarante.");
  return `<infoDirigenteSindical>${tag("categOrig", info.originCategory)}${opt("tpInsc", info.originRegistrationType)}${opt("nrInsc", origin || null)}${opt("dtAdmOrig", info.originAdmissionDate)}${opt("matricOrig", info.originRegistration)}${opt("tpRegTrab", info.workRegime)}${tag("tpRegPrev", info.socialSecurityRegime)}</infoDirigenteSindical>`;
}

function cededXml(input: S2300SpecialInput) {
  if (!(["305","410"] as string[]).includes(input.categoryCode)) return "";
  const info = input.cededWorker;
  if (!info) throw new Error(`Categoria ${input.categoryCode} exige infoTrabCedido.`);
  if (!/^\d{3}$/.test(info.originCategory) || ["305","410"].includes(info.originCategory)) throw new Error("Categoria de origem do cedido inválida.");
  const cedent = cnpj(info.cedentCnpj, "CNPJ do cedente");
  if (input.employerType === 1 && cedent.slice(0,8) === digits(input.employerNumber).slice(0,8)) throw new Error("CNPJ do cedente deve ser diferente do declarante.");
  if (!info.cedentRegistration.trim()) throw new Error("Trabalhador cedido exige matrícula no cedente.");
  if (info.cedentAdmissionDate > input.startDate) throw new Error("Data de admissão no cedente deve ser igual ou anterior ao início.");
  if (EMPLOYEE_CATEGORIES.has(info.originCategory) && [2,4].includes(info.socialSecurityRegime)) throw new Error("Origem empregado não admite RPPS/SPSMFA no trabalhador cedido.");
  if (input.categoryCode === "305" && info.socialSecurityRegime !== 2) throw new Error("Categoria 305 exige regime previdenciário 2.");
  return `<infoTrabCedido>${tag("categOrig", info.originCategory)}${tag("cnpjCednt", cedent)}${tag("matricCed", info.cedentRegistration)}${tag("dtAdmCed", info.cedentAdmissionDate)}${tag("tpRegTrab", info.workRegime)}${tag("tpRegPrev", info.socialSecurityRegime)}</infoTrabCedido>`;
}

function mandateXml(input: S2300SpecialInput) {
  if (input.categoryCode !== "304") return "";
  const info = input.electiveMandate;
  if (!info) throw new Error("Categoria 304 exige infoMandElet.");
  if (!/^\d{3}$/.test(info.originCategory) || info.originCategory === "304") throw new Error("Categoria de origem do mandato inválida.");
  const origin = cnpj(info.originCnpj, "CNPJ de origem do mandato");
  if (input.employerType === 1 && origin.slice(0,8) === digits(input.employerNumber).slice(0,8)) throw new Error("CNPJ de origem deve ser diferente do declarante.");
  if (!info.originRegistration.trim()) throw new Error("Mandato eletivo exige matrícula de origem.");
  if (info.originExerciseDate >= input.startDate || info.originExerciseDate < "1890-01-01") throw new Error("Data de exercício original deve ser anterior ao início e não anterior a 1890.");
  const politicalCbos = new Set(["111120","111250","111255"]);
  const positionCbo = digits(input.position.positionCbo ?? "");
  if (politicalCbos.has(positionCbo) && !info.keepOriginRemuneration) throw new Error("CBO político exige indRemunCargo.");
  if (!politicalCbos.has(positionCbo) && info.keepOriginRemuneration) throw new Error("indRemunCargo é exclusivo dos CBOs políticos previstos no leiaute.");
  return `<infoMandElet>${tag("categOrig", info.originCategory)}${tag("cnpjOrig", origin)}${tag("matricOrig", info.originRegistration)}${tag("dtExercOrig", info.originExerciseDate)}${opt("indRemunCargo", info.keepOriginRemuneration)}${tag("tpRegTrab", info.workRegime)}${tag("tpRegPrev", info.socialSecurityRegime)}</infoMandElet>`;
}

function localXml(input: S2300SpecialInput) {
  if (input.startDate < "2024-01-22") return "";
  const registration = digits(input.establishmentNumber);
  if (input.establishmentType === 1 && registration.length !== 14) throw new Error("Local CNPJ exige 14 dígitos.");
  if ([3,4].includes(input.establishmentType) && registration.length !== 12) throw new Error("Local CAEPF/CNO exige 12 dígitos.");
  return `<localTrabGeral>${tag("tpInsc", input.establishmentType)}${tag("nrInsc", registration)}</localTrabGeral>`;
}

export function buildS2300Special(input: S2300SpecialInput) {
  const eventKey = input.eventKey ?? makeEsocialEventId(input.employerType, input.employerNumber);
  const workerCpf = cpf(input.cpf, "CPF do TSVE");
  if (!/^\d{8}$/.test(digits(input.address.postalCode)) || !/^\d{7}$/.test(digits(input.address.cityIbgeCode))) throw new Error("S-2300 exige CEP e código IBGE em formato válido.");
  if (input.judicialProcessNumber && digits(input.judicialProcessNumber).length !== 20) throw new Error("Processo judicial do S-2300 deve ter 20 dígitos.");
  if (input.categoryCode === "401" && !input.activityNature) throw new Error("Categoria 401 exige natAtividade.");
  if (input.categoryCode !== "401" && input.activityNature) throw new Error("natAtividade não é usado nesta vertical para a categoria informada.");
  const trabalhador = `<trabalhador>${tag("cpfTrab", workerCpf)}${tag("nmTrab", input.fullName)}${tag("sexo", input.sex)}${tag("racaCor", input.raceColor)}${opt("estCiv", input.maritalStatus)}${tag("grauInstr", input.educationLevel)}<nascimento>${tag("dtNascto", input.birthDate)}${tag("paisNascto", input.birthCountryCode)}${tag("paisNac", input.nationalityCountryCode)}</nascimento><endereco><brasil>${opt("tpLograd", input.address.streetType)}${tag("dscLograd", input.address.street)}${tag("nrLograd", input.address.number)}${opt("complemento", input.address.complement)}${opt("bairro", input.address.neighborhood)}${tag("cep", digits(input.address.postalCode))}${tag("codMunic", digits(input.address.cityIbgeCode))}${tag("uf", input.address.state)}</brasil></endereco>${immigrantXml(input)}${input.phone || input.email ? `<contato>${opt("fonePrinc", input.phone ? digits(input.phone) : null)}${opt("emailPrinc", input.email)}</contato>` : ""}</trabalhador>`;
  const complement = `<infoComplementares>${positionXml(input)}${remunerationXml(input)}${unionLeaderXml(input)}${cededXml(input)}${mandateXml(input)}${localXml(input)}</infoComplementares>`;
  const info = `<infoTSVInicio>${tag("cadIni", "N")}${tag("matricula", input.registrationNumber)}${tag("codCateg", input.categoryCode)}${tag("dtInicio", input.startDate)}${opt("nrProcTrab", input.judicialProcessNumber ? digits(input.judicialProcessNumber) : null)}${opt("natAtividade", input.activityNature)}${complement}</infoTSVInicio>`;
  return `<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtTSVInicio/${LAYOUT}"><evtTSVInicio Id="${x(eventKey)}">${ideEvento(input.environment, input.receipt)}${ideEmpregador(input.employerType, input.employerNumber)}${trabalhador}${info}</evtTSVInicio></eSocial>`;
}
