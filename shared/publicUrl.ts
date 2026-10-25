/**
 * Normalizes a user-entered public web destination to HTTPS for display and transport.
 * Hostname reachability and private-network rejection remain server-side responsibilities.
 */
export function normalizePublicHttpsUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  const candidate = raw.startsWith("//") ? `https:${raw}` : /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (!url.hostname || (url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || url.hostname === "localhost" || url.hostname.endsWith(".local")) return "";
    url.protocol = "https:";
    return url.toString();
  } catch {
    return "";
  }
}
