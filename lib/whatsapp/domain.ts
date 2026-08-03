import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const WHATSAPP_SOURCE_TYPES = [
  "CONTRACT_TEMPLATE",
  "PROPOSAL_VERSION",
  "CONTRACT_VERSION",
  "AMENDMENT_VERSION",
  "PROJECT_DOCUMENT_VERSION"
] as const;

export type WhatsAppSourceType = typeof WHATSAPP_SOURCE_TYPES[number];

export const WHATSAPP_DELIVERY_STATUSES = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED"
] as const;

export type WhatsAppDeliveryStatus = typeof WHATSAPP_DELIVERY_STATUSES[number];

export const SOURCE_FIELDS: Record<WhatsAppSourceType, readonly string[]> = {
  CONTRACT_TEMPLATE: ["BODY_TEMPLATE"],
  PROPOSAL_VERSION: [
    "TITLE",
    "OBJECT_TEXT",
    "SCOPE_TEXT",
    "COMMERCIAL_SUMMARY",
    "PAYMENT_TERMS",
    "DEADLINE_TEXT",
    "WARRANTY_TEXT",
    "NOTES",
    "DOCUMENT"
  ],
  CONTRACT_VERSION: ["RENDERED_BODY", "DOCUMENT"],
  AMENDMENT_VERSION: ["RENDERED_BODY", "DOCUMENT"],
  PROJECT_DOCUMENT_VERSION: ["DOCUMENT"]
};

export type SourceSnapshot = {
  sourceType: WhatsAppSourceType;
  sourceId: string;
  sourceField: string;
  sourceVersion: number | null;
  sourceName: string;
  sha256: string;
  resolvedAt: string;
};

export type ResolvedWhatsAppSource =
  | {
      kind: "TEXT";
      body: string;
      snapshot: SourceSnapshot;
    }
  | {
      kind: "DOCUMENT";
      bucket: string;
      storagePath: string;
      fileName: string;
      mimeType: string | null;
      caption: string;
      snapshot: SourceSnapshot;
    };

export class WhatsAppDomainError extends Error {
  constructor(
    public readonly code:
      | "INVALID_PHONE"
      | "INVALID_SOURCE"
      | "UNRESOLVED_VARIABLE"
      | "INVALID_VARIABLES"
      | "OUTSIDE_SUPPORT_WINDOW"
      | "CONTENT_TOO_LONG"
      | "INVALID_SIGNATURE"
      | "PROVIDER_NOT_CONFIGURED"
      | "PROVIDER_ERROR",
    message: string
  ) {
    super(message);
    this.name = "WhatsAppDomainError";
  }
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    throw new WhatsAppDomainError("INVALID_PHONE", "Informe um telefone válido com DDD e país.");
  }
  return digits;
}

export function parseVariables(value: string | null | undefined): Record<string, string> {
  if (!value?.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("not_object");
    }
    return Object.fromEntries(
      Object.entries(parsed).map(([key, item]) => [
        key,
        item === null || item === undefined ? "" : String(item)
      ])
    );
  } catch {
    throw new WhatsAppDomainError(
      "INVALID_VARIABLES",
      "As variáveis devem ser informadas como um objeto JSON válido."
    );
  }
}

export function renderCanonicalText(
  template: string,
  variables: Record<string, string>
) {
  const unresolved = new Set<string>();
  const body = template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => {
    if (!(key in variables)) {
      unresolved.add(key);
      return "";
    }
    return variables[key];
  });

  if (unresolved.size) {
    throw new WhatsAppDomainError(
      "UNRESOLVED_VARIABLE",
      `Variáveis obrigatórias não informadas: ${[...unresolved].join(", ")}.`
    );
  }
  if (body.length > 4096) {
    throw new WhatsAppDomainError(
      "CONTENT_TOO_LONG",
      "O conteúdo resolvido excede o limite desta mensagem. Envie o documento vinculado."
    );
  }
  return body;
}

export function isSupportWindowOpen(
  lastCustomerMessageAt: string | null | undefined,
  now = new Date()
) {
  if (!lastCustomerMessageAt) return false;
  const timestamp = new Date(lastCustomerMessageAt).getTime();
  if (!Number.isFinite(timestamp)) return false;
  const elapsed = now.getTime() - timestamp;
  return elapsed >= 0 && elapsed <= 24 * 60 * 60 * 1000;
}

const DELIVERY_LADDER: readonly WhatsAppDeliveryStatus[] = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ"
];

/**
 * Prevents replayed/out-of-order provider events from regressing a message.
 * FAILED is terminal and is accepted only before successful delivery.
 */
export function canAdvanceWhatsAppDeliveryStatus(
  current: string,
  incoming: WhatsAppDeliveryStatus
) {
  const currentStatus = current as WhatsAppDeliveryStatus;
  if (currentStatus === incoming || currentStatus === "FAILED") return false;
  if (incoming === "FAILED") {
    return currentStatus === "QUEUED" || currentStatus === "SENT";
  }
  const currentIndex = DELIVERY_LADDER.indexOf(currentStatus);
  const incomingIndex = DELIVERY_LADDER.indexOf(incoming);
  return incomingIndex >= 0 && (currentIndex < 0 || incomingIndex > currentIndex);
}

export function hashCanonicalSource(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function parseSourceToken(value: string) {
  const [sourceType, sourceId, sourceField] = value.split("|");
  if (
    !WHATSAPP_SOURCE_TYPES.includes(sourceType as WhatsAppSourceType) ||
    !/^[0-9a-f-]{36}$/i.test(sourceId ?? "") ||
    !SOURCE_FIELDS[sourceType as WhatsAppSourceType].includes(sourceField ?? "")
  ) {
    throw new WhatsAppDomainError("INVALID_SOURCE", "A fonte selecionada é inválida.");
  }
  return {
    sourceType: sourceType as WhatsAppSourceType,
    sourceId,
    sourceField
  };
}

export function verifyMetaWebhookSignature(
  rawBody: string,
  receivedSignature: string | null,
  appSecret: string
) {
  const normalized = String(receivedSignature ?? "")
    .replace(/^sha256=/i, "")
    .trim()
    .toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return timingSafeEqual(Buffer.from(normalized, "hex"), Buffer.from(expected, "hex"));
}

export function orderedTemplateParameters(
  parameterOrder: string[],
  variables: Record<string, string>
) {
  return parameterOrder.map(key => {
    if (!(key in variables)) {
      throw new WhatsAppDomainError(
        "UNRESOLVED_VARIABLE",
        `Variável obrigatória do template não informada: ${key}.`
      );
    }
    return variables[key];
  });
}
