import { createHash } from "node:crypto";

// Definição de objeto dinâmico: a especificação declarada pelo administrador.
// Este módulo é lógica pura e não importa `server-only`, para poder ser
// exercitado em teste — a lição registrada no achado FND-0004 da Etapa 20.
// Contrato completo em `diretrizes/OBJECT-RUNTIME.md`.

export const FIELD_TYPES = [
  "texto",
  "texto_longo",
  "numero",
  "moeda",
  "percentual",
  "data",
  "data_hora",
  "booleano",
  "selecao",
  "selecao_multipla",
  "referencia",
  "anexo",
  "geolocalizacao",
  "assinatura",
  "usuario"
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const OBJECT_CLASSES = ["cadastro", "extensao"] as const;
export type ObjectClass = (typeof OBJECT_CLASSES)[number];

// Escopo do objeto. `projeto` liga o registro a um `project_id` e faz a
// permissão ser resolvida também por esse recorte — o mesmo argumento que
// `has_module_permission` já recebe hoje. O termo que a empresa usa para o
// recorte é vocabulário do segmento e não pertence a este módulo.
export const OBJECT_SCOPES = ["organizacao", "projeto"] as const;
export type ObjectScope = (typeof OBJECT_SCOPES)[number];

export const TRAITS = [
  "auditavel",
  "arquivavel",
  "extensao_de",
  "versionavel",
  "aprovavel",
  "anexavel",
  "comentavel",
  "georreferenciado",
  "numerado",
  "importavel",
  "exportavel",
  "alto_volume"
] as const;
export type Trait = (typeof TRAITS)[number];

export type SlotFamily = "num" | "txt" | "dt" | "bool" | "ref";

// Orçamento de colunas-slot da camada compartilhada. Objeto que precisa de
// mais campos filtráveis do que isto é candidato à camada dedicada.
export const SLOT_BUDGET: Readonly<Record<SlotFamily, number>> = {
  num: 4,
  txt: 4,
  dt: 2,
  bool: 2,
  ref: 2
};

export const MAX_FIELDS = 200;

const SLOT_FAMILY_BY_TYPE: Readonly<Partial<Record<FieldType, SlotFamily>>> = {
  texto: "txt",
  selecao: "txt",
  numero: "num",
  moeda: "num",
  percentual: "num",
  data: "dt",
  data_hora: "dt",
  booleano: "bool",
  referencia: "ref",
  usuario: "ref"
};

const IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;

export type ObjectFieldSpec = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Campo filtrável e ordenável: consome uma coluna-slot. */
  indexed?: boolean;
  options?: readonly string[];
};

export type ObjectSpec = {
  key: string;
  name: string;
  class: ObjectClass;
  /** Aplicativo do qual o objeto herda o modelo de permissão. */
  moduleKey: string;
  scope: ObjectScope;
  traits: readonly string[];
  fields: readonly ObjectFieldSpec[];
};

/**
 * Serialização determinística: chaves de objeto em ordem alfabética, ordem de
 * array preservada. Duas definições equivalentes escritas em ordem diferente
 * produzem a mesma string, e portanto o mesmo checksum.
 */
export function canonicalSpecJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalSpecJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalSpecJson(item)}`).join(",")}}`;
}

/**
 * Impressão digital local do rascunho, para detectar que a definição mudou
 * entre duas edições.
 *
 * **Não é o checksum da versão publicada.** Aquele é calculado no banco por
 * `object_runtime_spec_checksum(jsonb)`, sobre a forma canônica do próprio
 * `jsonb`, e é o único que vale como prova de que a versão não foi alterada
 * depois de publicada. Os dois valores são diferentes por construção, porque
 * as formas canônicas são diferentes — reproduzir em TypeScript a
 * serialização textual do `jsonb` do PostgreSQL seria frágil e impossível de
 * verificar sem banco. Nomes distintos para que ninguém compare os dois.
 */
export function specFingerprint(spec: ObjectSpec): string {
  return createHash("sha256").update(canonicalSpecJson(spec), "utf8").digest("hex");
}

/** Família de slot do tipo, ou `null` quando o tipo não é filtrável. */
export function slotFamilyFor(type: FieldType): SlotFamily | null {
  return SLOT_FAMILY_BY_TYPE[type] ?? null;
}

export type SlotAllocation = {
  /** Chave do campo → coluna física, por exemplo `titulo` → `txt_1`. */
  slots: Record<string, string>;
  /** Campos indexáveis que não couberam no orçamento da própria família. */
  overflow: string[];
};

/**
 * Aloca colunas-slot na ordem de declaração. O estouro de uma família não
 * impede as demais de serem alocadas: o relatório precisa dizer exatamente
 * qual campo não coube, não apenas que algo não coube.
 */
export function allocateSlots(fields: readonly ObjectFieldSpec[]): SlotAllocation {
  const used: Record<SlotFamily, number> = { num: 0, txt: 0, dt: 0, bool: 0, ref: 0 };
  const slots: Record<string, string> = {};
  const overflow: string[] = [];

  for (const field of fields) {
    if (!field.indexed) continue;
    const family = slotFamilyFor(field.type);
    if (!family) continue;
    if (used[family] >= SLOT_BUDGET[family]) {
      overflow.push(field.key);
      continue;
    }
    used[family] += 1;
    slots[field.key] = `${family}_${used[family]}`;
  }

  return { slots, overflow };
}

export type SlotUsage = Readonly<Record<SlotFamily, { used: number; budget: number }>>;

/**
 * Quanto do orçamento de campos filtráveis já foi gasto, por família.
 *
 * Existe para a tela poder dizer "3 de 4 campos de texto filtráveis" **antes**
 * de o administrador declarar o quarto e o quinto. Descobrir o teto na hora de
 * publicar, com trinta campos já digitados, é descobrir tarde.
 */
export function slotUsage(fields: readonly ObjectFieldSpec[]): SlotUsage {
  const used: Record<SlotFamily, number> = { num: 0, txt: 0, dt: 0, bool: 0, ref: 0 };
  for (const [key, slot] of Object.entries(allocateSlots(fields).slots)) {
    void key;
    const family = slot.split("_")[0] as SlotFamily;
    used[family] += 1;
  }
  return {
    num: { used: used.num, budget: SLOT_BUDGET.num },
    txt: { used: used.txt, budget: SLOT_BUDGET.txt },
    dt: { used: used.dt, budget: SLOT_BUDGET.dt },
    bool: { used: used.bool, budget: SLOT_BUDGET.bool },
    ref: { used: used.ref, budget: SLOT_BUDGET.ref }
  };
}

/**
 * Erros da definição, em linguagem que orienta quem declarou. Lista vazia
 * significa definição publicável. Recusar cedo é deliberado: definição
 * incoerente publicada vira dado incoerente, e dado incoerente não tem
 * conserto barato.
 */
export function validateSpec(spec: ObjectSpec): string[] {
  const errors: string[] = [];

  if (!IDENTIFIER.test(spec.key ?? "")) {
    errors.push(`Chave do objeto inválida: "${spec.key}". Use minúsculas, dígitos e sublinhado, começando por letra.`);
  }
  if (!spec.name?.trim()) errors.push("O objeto precisa de um nome.");
  if (!OBJECT_CLASSES.includes(spec.class)) {
    errors.push(`Classe desconhecida: "${spec.class}". Disponíveis: ${OBJECT_CLASSES.join(", ")}.`);
  }
  if (!OBJECT_SCOPES.includes(spec.scope)) {
    errors.push(`Escopo desconhecido: "${spec.scope}". Disponíveis: ${OBJECT_SCOPES.join(", ")}.`);
  }
  if (!spec.moduleKey?.trim()) {
    errors.push("O objeto precisa declarar o aplicativo do qual herda a permissão (`moduleKey`).");
  }

  for (const trait of spec.traits ?? []) {
    if (!(TRAITS as readonly string[]).includes(trait)) {
      errors.push(`Característica desconhecida: "${trait}".`);
    }
  }

  const fields = spec.fields ?? [];
  if (fields.length === 0) errors.push("O objeto precisa de ao menos um campo.");
  if (fields.length > MAX_FIELDS) {
    errors.push(`O objeto declara ${fields.length} campos e o teto é ${MAX_FIELDS}.`);
  }

  const seen = new Set<string>();
  for (const field of fields) {
    if (!IDENTIFIER.test(field.key ?? "")) {
      errors.push(`Chave de campo inválida: "${field.key}". Use minúsculas, dígitos e sublinhado, começando por letra.`);
      continue;
    }
    if (seen.has(field.key)) errors.push(`Chave de campo duplicada: "${field.key}".`);
    seen.add(field.key);

    if (!(FIELD_TYPES as readonly string[]).includes(field.type)) {
      errors.push(`Tipo desconhecido no campo "${field.key}": "${field.type}".`);
      continue;
    }
    if ((field.type === "selecao" || field.type === "selecao_multipla") && !(field.options?.length)) {
      errors.push(`O campo "${field.key}" é de seleção e precisa declarar as opções.`);
    }
    if (field.indexed && !slotFamilyFor(field.type)) {
      errors.push(`O campo "${field.key}" é do tipo "${field.type}", que não é filtrável.`);
    }
  }

  for (const key of allocateSlots(fields).overflow) {
    const family = slotFamilyFor(fields.find(field => field.key === key)?.type ?? "texto");
    errors.push(
      `O campo "${key}" não coube no orçamento de campos filtráveis da família "${family}" (limite ${family ? SLOT_BUDGET[family] : 0}). Reduza os campos filtráveis ou promova o objeto à camada dedicada.`
    );
  }

  return errors;
}
