/**
 * Removes retired, non-authoritative query parameters from legacy practice links.
 * Authentication remains enforced separately by the protected screen boundary.
 */
export function normalizePracticeLocation(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete("preview");
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}
