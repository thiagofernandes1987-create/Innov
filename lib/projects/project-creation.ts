import {
  projectCreationError,
  type ProjectCreationState
} from "@/lib/forms/project-creation-state";

export const PROJECT_ENTRY_MODES = ["INDEPENDENT", "IN_PROGRESS", "HISTORICAL", "IMPORTED"] as const;
export type ProjectEntryMode = (typeof PROJECT_ENTRY_MODES)[number];

export const PROJECT_STATUSES_BY_MODE: Record<ProjectEntryMode, readonly string[]> = {
  INDEPENDENT: ["PLANNING", "ACTIVE", "ON_HOLD"],
  IN_PROGRESS: ["ACTIVE", "IN_PROGRESS", "ON_HOLD"],
  HISTORICAL: ["COMPLETED"],
  IMPORTED: ["PLANNING", "ACTIVE", "IN_PROGRESS", "ON_HOLD", "COMPLETED"]
};

type ProviderError = {
  code?: string | null;
  message?: string | null;
};

export type FlexibleProjectInput = {
  organizationId: string;
  clientId: string | null;
  managerId: string | null;
  entryMode: ProjectEntryMode;
  code: string;
  name: string;
  status: string;
  description: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  progress: number;
  dataCutoff: string | null;
  historicalCost: number;
  addressLine: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  importedFrom: string | null;
};

export type ContractProjectInput = {
  contractId: string;
  code: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
  addressLine: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
};

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function optional(formData: FormData, name: string) {
  return text(formData, name) || null;
}

function parsePtBrDecimal(raw: string) {
  if (!raw) return null;
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
}

function validIsoDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeState(value: string | null) {
  return value ? value.toUpperCase() : null;
}

function normalizePostalCode(value: string | null) {
  return value ? value.replace(/\D/g, "") : null;
}

export function validateFlexibleProject(
  formData: FormData,
  organizationId: string
): { ok: true; value: FlexibleProjectInput } | { ok: false; state: ProjectCreationState } {
  const entryModeRaw = text(formData, "entryMode") || "INDEPENDENT";
  const entryMode = PROJECT_ENTRY_MODES.includes(entryModeRaw as ProjectEntryMode)
    ? entryModeRaw as ProjectEntryMode
    : null;
  const code = text(formData, "code").toUpperCase();
  const name = text(formData, "name");
  const status = text(formData, "status").toUpperCase();
  const plannedStart = optional(formData, "plannedStart");
  const plannedEnd = optional(formData, "plannedEnd");
  const actualStart = optional(formData, "actualStart");
  const dataCutoff = optional(formData, "dataCutoff");
  const progressRaw = text(formData, "progressPercent");
  const progressPercent = progressRaw ? parsePtBrDecimal(progressRaw) : 0;
  const historicalCostRaw = text(formData, "historicalCost");
  const historicalCost = historicalCostRaw ? parsePtBrDecimal(historicalCostRaw) : 0;
  const importedFrom = optional(formData, "importedFrom");
  const state = normalizeState(optional(formData, "state"));
  const postalCode = normalizePostalCode(optional(formData, "postalCode"));
  const fieldErrors: ProjectCreationState["fieldErrors"] = {};

  if (!entryMode) fieldErrors.entryMode = "Selecione uma origem válida para o projeto.";
  if (!code) fieldErrors.code = "Informe o código da obra ou projeto.";
  if (!name) fieldErrors.name = "Informe o nome da obra ou projeto.";
  if (entryMode && !PROJECT_STATUSES_BY_MODE[entryMode].includes(status)) {
    fieldErrors.status = "A situação inicial não é compatível com a origem escolhida.";
  }
  if (Number.isNaN(progressPercent) || progressPercent === null || progressPercent < 0 || progressPercent > 100) {
    fieldErrors.progressPercent = "Informe um progresso entre 0% e 100%.";
  }
  if (Number.isNaN(historicalCost) || historicalCost === null || historicalCost < 0) {
    fieldErrors.historicalCost = "Informe um custo histórico válido e não negativo.";
  }
  if ((plannedStart && !validIsoDate(plannedStart)) || (plannedEnd && !validIsoDate(plannedEnd))) {
    fieldErrors.plannedStart = "Informe datas planejadas válidas.";
  } else if (Boolean(plannedStart) !== Boolean(plannedEnd)) {
    fieldErrors.plannedEnd = "Informe início e término planejados, ou deixe ambos em branco.";
  } else if (plannedStart && plannedEnd && plannedEnd < plannedStart) {
    fieldErrors.plannedEnd = "O término planejado não pode ser anterior ao início.";
  }
  if (actualStart && !validIsoDate(actualStart)) fieldErrors.actualStart = "Informe uma data real válida.";
  if (dataCutoff && !validIsoDate(dataCutoff)) fieldErrors.dataCutoff = "Informe uma data de corte válida.";
  if (entryMode && ["IN_PROGRESS", "HISTORICAL", "IMPORTED"].includes(entryMode)) {
    if (!dataCutoff) fieldErrors.dataCutoff = "A obra existente ou importada exige uma data de corte.";
    else if (validIsoDate(dataCutoff) && dataCutoff > todayIso()) fieldErrors.dataCutoff = "A data de corte não pode estar no futuro.";
  }
  if (entryMode && ["IN_PROGRESS", "HISTORICAL"].includes(entryMode) && !actualStart) {
    fieldErrors.actualStart = "Informe a data real de início da obra.";
  }
  if (actualStart && dataCutoff && validIsoDate(actualStart) && validIsoDate(dataCutoff) && actualStart > dataCutoff) {
    fieldErrors.actualStart = "O início real não pode ser posterior à data de corte.";
  }
  if (entryMode === "HISTORICAL" && progressPercent !== 100) {
    fieldErrors.progressPercent = "Obra histórica concluída deve entrar com 100% de avanço.";
  }
  if (entryMode === "IMPORTED" && !importedFrom) {
    fieldErrors.importedFrom = "Informe o sistema, planilha ou arquivo de origem.";
  }
  if (state && !/^[A-Z]{2}$/.test(state)) fieldErrors.state = "Informe a UF com duas letras.";
  if (postalCode && !/^\d{8}$/.test(postalCode)) fieldErrors.postalCode = "Informe um CEP com oito dígitos.";

  if (Object.keys(fieldErrors).length) {
    return { ok: false, state: projectCreationError("Revise os campos destacados antes de criar o projeto.", fieldErrors) };
  }

  return {
    ok: true,
    value: {
      organizationId,
      clientId: optional(formData, "clientId"),
      managerId: optional(formData, "managerId"),
      entryMode: entryMode as ProjectEntryMode,
      code,
      name,
      status,
      description: optional(formData, "description"),
      plannedStart,
      plannedEnd,
      actualStart,
      progress: (progressPercent as number) / 100,
      dataCutoff,
      historicalCost: historicalCost as number,
      addressLine: optional(formData, "addressLine"),
      district: optional(formData, "district"),
      city: optional(formData, "city"),
      state,
      postalCode,
      importedFrom
    }
  };
}

export function validateContractProject(
  formData: FormData
): { ok: true; value: ContractProjectInput } | { ok: false; state: ProjectCreationState } {
  const contractId = text(formData, "contractId");
  const code = text(formData, "code").toUpperCase();
  const name = text(formData, "name");
  const plannedStart = text(formData, "plannedStart");
  const plannedEnd = text(formData, "plannedEnd");
  const state = normalizeState(optional(formData, "state"));
  const postalCode = normalizePostalCode(optional(formData, "postalCode"));
  const fieldErrors: ProjectCreationState["fieldErrors"] = {};

  if (!contractId) fieldErrors.contractId = "Selecione um contrato disponível.";
  if (!code) fieldErrors.code = "Informe o código da obra.";
  if (!name) fieldErrors.name = "Informe o nome da obra.";
  if (!validIsoDate(plannedStart)) fieldErrors.plannedStart = "Informe o início planejado.";
  if (!validIsoDate(plannedEnd)) fieldErrors.plannedEnd = "Informe o término planejado.";
  if (validIsoDate(plannedStart) && validIsoDate(plannedEnd) && plannedEnd < plannedStart) {
    fieldErrors.plannedEnd = "O término planejado não pode ser anterior ao início.";
  }
  if (state && !/^[A-Z]{2}$/.test(state)) fieldErrors.state = "Informe a UF com duas letras.";
  if (postalCode && !/^\d{8}$/.test(postalCode)) fieldErrors.postalCode = "Informe um CEP com oito dígitos.";

  if (Object.keys(fieldErrors).length) {
    return { ok: false, state: projectCreationError("Revise os campos destacados antes de converter o contrato.", fieldErrors) };
  }

  return {
    ok: true,
    value: {
      contractId,
      code,
      name,
      plannedStart,
      plannedEnd,
      addressLine: optional(formData, "addressLine"),
      district: optional(formData, "district"),
      city: optional(formData, "city"),
      state,
      postalCode
    }
  };
}

export function classifyProjectCreationProviderError(
  error: ProviderError | null | undefined,
  fallback: string
): ProjectCreationState {
  const code = error?.code ?? "UNKNOWN";
  const message = String(error?.message ?? "").toLocaleLowerCase("pt-BR");

  if (code === "23505" || message.includes("código de obra já utilizado") || message.includes("duplicate key")) {
    return projectCreationError("Já existe uma obra ou projeto com este código nesta organização.", {
      code: "Escolha um código diferente."
    });
  }
  if (message.includes("contrato já possui") || message.includes("contrato não encontrado")) {
    return projectCreationError("O contrato selecionado não está mais disponível para conversão.", {
      contractId: "Atualize a lista e selecione outro contrato."
    });
  }
  if (message.includes("cliente não pertence")) {
    return projectCreationError("O cliente selecionado não está disponível nesta organização.", {
      clientId: "Selecione outro cliente ou deixe a vinculação para depois."
    });
  }
  if (message.includes("responsável") || message.includes("membro ativo")) {
    return projectCreationError("O responsável selecionado não pode gerenciar esta obra.", {
      managerId: "Selecione um membro ativo da equipe de gestão."
    });
  }
  if (code === "42501" || message.includes("acesso negado") || message.includes("permission denied")) {
    return projectCreationError("Seu perfil não possui permissão para criar esta obra ou projeto.");
  }
  if (message.includes("data de corte")) {
    return projectCreationError("A data de corte informada não é válida para esta origem.", {
      dataCutoff: "Revise a data de corte."
    });
  }
  if (message.includes("período planejado") || message.includes("término planejado")) {
    return projectCreationError("O período planejado informado é inválido.", {
      plannedEnd: "O término deve ser igual ou posterior ao início."
    });
  }

  return projectCreationError(fallback);
}
