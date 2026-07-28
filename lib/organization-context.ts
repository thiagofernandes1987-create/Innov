export const ACTIVE_ORGANIZATION_COOKIE = "innovar-active-organization";

const INTERNAL_ORIGIN = "https://innovar.invalid";
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export function safeInternalReturnPath(value: string | null | undefined, fallback = "/app") {
  const candidate = String(value ?? "").trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(candidate);
  } catch {
    return fallback;
  }

  if (
    candidate.includes("\\") ||
    decoded.includes("\\") ||
    CONTROL_CHARACTERS.test(candidate) ||
    CONTROL_CHARACTERS.test(decoded) ||
    decoded.startsWith("//")
  ) {
    return fallback;
  }

  try {
    const resolved = new URL(candidate, INTERNAL_ORIGIN);
    if (resolved.origin !== INTERNAL_ORIGIN || !resolved.pathname.startsWith("/")) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
