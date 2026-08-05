export type LauncherRecentItem = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string | null;
  href: string;
};

export type LauncherSummary = {
  label: string;
  value: string;
  support?: string | null;
  progress?: number | null;
  secondaryLabel?: string | null;
  secondaryValue?: string | null;
  recent?: LauncherRecentItem[];
  available: boolean;
};

export type LauncherSummaryMap = Record<string, LauncherSummary>;

export function clampProgress(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function unavailableSummary(label = "Indicador do módulo"): LauncherSummary {
  return {
    label,
    value: "Indisponível",
    support: "Atualize ou abra o aplicativo",
    progress: null,
    available: false
  };
}
