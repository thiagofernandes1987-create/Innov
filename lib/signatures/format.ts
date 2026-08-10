/**
 * Formatação pura usada na trilha de assinatura. Fica fora de `crypto.ts` porque
 * aquele módulo importa `server-only`, o que impede exercitar estas funções em
 * teste — e elas são justamente as que precisam de cobertura: uma delas monta
 * nome de arquivo servido em Content-Disposition, a outra define a serialização
 * canônica que entra no hash da evidência.
 */

export function safeFileName(name: string) {
  const normalized = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const safe = normalized.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return safe.slice(0, 120) || "arquivo";
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
}
