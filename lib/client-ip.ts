import "server-only";

// x-forwarded-for is a chain: "client-claimed, ..., peer-of-our-proxy" — a
// request can set its own leading entries to whatever it wants, so reading
// the FIRST one lets an attacker get a fresh rate-limit bucket on every
// request just by sending a different fake value each time. The one entry
// a client can't forge is the LAST — the peer IP Vercel's own edge appends
// right before forwarding to us. x-real-ip, where present, is simpler still
// (a single trusted value). Falling back to a shared bucket locally just
// means local dev shares one rate limit, which is fine.
export function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim());
    return parts[parts.length - 1] || "unknown";
  }
  return "unknown";
}
