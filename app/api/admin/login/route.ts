import {
  checkPasscode,
  createAdminSession,
  isLoginRateLimited,
  recordLoginAttempt,
} from "@/lib/admin-auth";
import { clientIp } from "@/lib/client-ip";

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
