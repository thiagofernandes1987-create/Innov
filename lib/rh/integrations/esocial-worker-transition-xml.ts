import { buildS2200StandardClt, type S2200Input } from "./esocial-worker-xml";

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function tag(name: string, value: unknown) {
  return `<${name}>${escapeXml(value)}</${name}>`;
}

function optionalTag(name: string, value: unknown) {
  return value === null || value === undefined || value === "" ? "" : tag(name, value);
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export type S2200Succession = {
  registrationType: 1 | 2 | 5 | 6;
  registrationNumber: string;
  previousRegistration: string;
  transferDate: string;
  observation?: string | null;
};

export type S2200CpfChange = {
  previousCpf: string;
  previousRegistration: string;
  changeDate: string;
  observation?: string | null;
};

export type S2200TransitionInput = Omit<S2200Input, "admissionDate" | "admissionType" | "admissionIndicator"> & {
  originalAdmissionDate: string;
  admissionType: 2 | 3 | 4 | 6 | 7;
  admissionIndicator: 1 | 2 | 3;
  judicialProcessNumber?: string | null;
  succession?: S2200Succession | null;
  cpfChange?: S2200CpfChange | null;
};

function successionXml(input: S2200TransitionInput) {
  if (![2, 3, 4, 7].includes(input.admissionType)) {
    if (input.succession) throw new Error("sucessaoVinc só é admitido nos tipos de admissão 2, 3, 4 ou 7.");
    return "";
  }
  const succession = input.succession;
  if (!succession) throw new Error("Transferência/sucessão exige o grupo sucessaoVinc.");
  if (!succession.previousRegistration.trim()) throw new Error("Transferência/sucessão exige matrícula anterior.");
  if (succession.transferDate <= input.originalAdmissionDate) throw new Error("Data de transferência deve ser posterior à admissão original.");

  const number = digits(succession.registrationNumber);
  if (succession.registrationType === 1 && number.length !== 14) throw new Error("Empregador anterior CNPJ exige 14 dígitos.");
  if (succession.registrationType === 2 && number.length !== 11) throw new Error("Empregador anterior CPF exige 11 dígitos.");
  if (succession.registrationType === 5 && (number.length < 8 || number.length > 14)) throw new Error("CGC anterior exige de 8 a 14 dígitos.");
  if (succession.registrationType === 6 && number.length !== 12) throw new Error("CEI anterior exige 12 dígitos.");

  const current = digits(input.employerNumber);
  if (succession.registrationType === 1 && input.employerType === 1 && number.slice(0, 8) === current.slice(0, 8)) {
    throw new Error("CNPJ do empregador anterior deve ser diferente do CNPJ-base do declarante.");
  }
  if (succession.registrationType === 2 && input.employerType === 2 && number === current) {
    throw new Error("CPF do empregador anterior deve ser diferente do declarante.");
  }

  return `<sucessaoVinc>${tag("tpInsc", succession.registrationType)}${tag("nrInsc", number)}${tag("matricAnt", succession.previousRegistration)}${tag("dtTransf", succession.transferDate)}${optionalTag("observacao", succession.observation)}</sucessaoVinc>`;
}

function cpfChangeXml(input: S2200TransitionInput) {
  if (input.admissionType !== 6) {
    if (input.cpfChange) throw new Error("mudancaCPF só é admitido quando tpAdmissao=6.");
    return "";
  }
  const change = input.cpfChange;
  if (!change) throw new Error("Mudança de CPF exige o grupo mudancaCPF.");
  const previousCpf = digits(change.previousCpf);
  const currentCpf = digits(input.cpf);
  if (previousCpf.length !== 11) throw new Error("CPF anterior deve possuir 11 dígitos.");
  if (previousCpf === currentCpf) throw new Error("CPF anterior deve ser diferente do novo CPF.");
  if (!change.previousRegistration.trim()) throw new Error("Mudança de CPF exige matrícula anterior.");
  if (change.changeDate <= input.originalAdmissionDate) throw new Error("Data da mudança de CPF deve ser posterior à admissão original.");
  if (input.succession) throw new Error("Mudança de CPF não deve informar sucessaoVinc.");
  return `<mudancaCPF>${tag("cpfAnt", previousCpf)}${tag("matricAnt", change.previousRegistration)}${tag("dtAltCPF", change.changeDate)}${optionalTag("observacao", change.observation)}</mudancaCPF>`;
}

export function buildS2200TransitionClt(input: S2200TransitionInput) {
  if (![2, 3, 4, 6, 7].includes(input.admissionType)) throw new Error("Tipo de admissão de transição não suportado.");
  if (![1, 2, 3].includes(input.admissionIndicator)) throw new Error("Indicativo de admissão inválido.");
  const process = digits(input.judicialProcessNumber ?? "");
  if (input.admissionIndicator === 3 && process.length !== 20) throw new Error("Decisão judicial exige processo trabalhista com 20 dígitos.");
  if (input.admissionIndicator !== 3 && process) throw new Error("Processo trabalhista é exclusivo de admissão decorrente de decisão judicial.");

  const baseInput: S2200Input = {
    ...input,
    admissionDate: input.originalAdmissionDate,
    admissionType: 1,
    admissionIndicator: 1
  };
  let xml = buildS2200StandardClt(baseInput);

  const standard = `<dtAdm>${escapeXml(input.originalAdmissionDate)}</dtAdm><tpAdmissao>1</tpAdmissao><indAdmissao>1</indAdmissao>`;
  const replacement = `<dtAdm>${escapeXml(input.originalAdmissionDate)}</dtAdm><tpAdmissao>${input.admissionType}</tpAdmissao><indAdmissao>${input.admissionIndicator}</indAdmissao>${input.admissionIndicator === 3 ? tag("nrProcTrab", process) : ""}`;
  if (!xml.includes(standard)) throw new Error("Estrutura base S-2200 incompatível com o gerador de transição.");
  xml = xml.replace(standard, replacement);

  const transitionGroup = input.admissionType === 6 ? cpfChangeXml(input) : successionXml(input);
  const closeVinculo = "</vinculo>";
  const position = xml.lastIndexOf(closeVinculo);
  if (position < 0) throw new Error("Estrutura base S-2200 sem fechamento de vínculo.");
  return `${xml.slice(0, position)}${transitionGroup}${xml.slice(position)}`;
}
