// Lightweight "does this look like a real web link" check — not a
// reachability check (that would need a server round-trip, and would give
// false negatives for sites that block server-side/bot requests, e.g.
// Amazon). This only catches obvious typos or garbage before they get
// saved — it can't confirm the link actually goes anywhere real.
export function isLikelyValidUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true; // empty is fine — these fields are optional
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
