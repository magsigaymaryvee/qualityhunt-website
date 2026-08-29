import {
  checkPasscode,
  createAdminSession,
  isLoginRateLimited,
  recordLoginAttempt,
} from "@/lib/admin-auth";

// x-forwarded-for is a chain: "client-claimed, ..., peer-of-our-proxy" — a
// request can set its own leading entries to whatever it wants, so reading
// the FIRST one (a past version of this function did) lets an attacker get
// a fresh rate-limit bucket on every request just by sending a different
// fake value each time. The one entry a client can't forge is the LAST —
// the peer IP Vercel's own edge appends right before forwarding to us.
// x-real-ip, where present, is simpler still (a single trusted value).
// Falling back to a shared bucket locally just means local dev shares one
// rate limit, which is fine.
function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim());
    return parts[parts.length - 1] || "unknown";
  }
  return "unknown";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { passcode } = (body ?? {}) as { passcode?: unknown };
  if (typeof passcode !== "string" || !passcode) {
    return Response.json({ error: "passcode is required." }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSCODE || !process.env.ADMIN_SESSION_SECRET) {
    return Response.json({ error: "Admin isn't configured yet." }, { status: 503 });
  }

  const ip = clientIp(request);
  if (await isLoginRateLimited(ip)) {
    return Response.json(
      { error: "Too many attempts. Wait a while before trying again." },
      { status: 429 }
    );
  }
  await recordLoginAttempt(ip);

  if (!checkPasscode(passcode)) {
    return Response.json({ error: "Wrong passcode." }, { status: 401 });
  }

  await createAdminSession();
  return Response.json({ ok: true });
}
