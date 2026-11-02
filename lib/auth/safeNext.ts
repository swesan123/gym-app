/** Accept only same-origin relative paths (no protocol-relative URLs). */
export function sanitizeNextPath(raw: string | null | undefined): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/";
  }
  if (trimmed.includes("://")) {
    return "/";
  }
  return trimmed;
}
