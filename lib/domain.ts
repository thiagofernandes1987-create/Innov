export const budgetStatuses = [
  "DRAFT",
  "CALCULATING",
  "TECHNICAL_REVIEW",
  "FINANCIAL_REVIEW",
  "APPROVAL_PENDING",
  "APPROVED",
  "CLIENT_SENT",
  "NEGOTIATION",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CONTRACTED",
  "ARCHIVED"
] as const;

export const proposalStatuses = [
  "DRAFT",
  "INTERNAL_REVIEW",
  "APPROVED",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED"
] as const;

export const contractStatuses = [
  "DRAFT",
  "INTERNAL_REVIEW",
  "CLIENT_REVIEW",
  "SIGNATURE_PENDING",
  "PARTIALLY_SIGNED",
  "SIGNED",
  "ACTIVE",
  "AMENDED",
  "COMPLETED",
  "TERMINATED",
  "CANCELED"
] as const;

export const signatureStatuses = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "PARTIALLY_SIGNED",
  "COMPLETED",
  "DECLINED",
  "EXPIRED",
  "CANCELED",
  "ERROR"
] as const;

export type BudgetStatus = (typeof budgetStatuses)[number];
export type ProposalStatus = (typeof proposalStatuses)[number];
export type ContractStatus = (typeof contractStatuses)[number];
export type SignatureStatus = (typeof signatureStatuses)[number];

export const budgetStatusLabels: Record<BudgetStatus, string> = {
  DRAFT: "Rascunho",
  CALCULATING: "Calculando",
  TECHNICAL_REVIEW: "Revisão técnica",
  FINANCIAL_REVIEW: "Revisão financeira",
  APPROVAL_PENDING: "Aguardando aprovação",
  APPROVED: "Aprovado",
  CLIENT_SENT: "Enviado ao cliente",
  NEGOTIATION: "Negociação",
  ACCEPTED: "Aceito",
  REJECTED: "Rejeitado",
  EXPIRED: "Expirado",
  CONTRACTED: "Contratado",
  ARCHIVED: "Arquivado"
};

export const formatCurrency = (value: number, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);

export const formatPercent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2 }).format(value);
