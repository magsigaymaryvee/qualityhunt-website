// Client-side fetch helper used by the admin pages. A route handler can fail
// before it ever produces JSON (a thrown error becomes Next's HTML error
// page, a network drop returns nothing at all) — parsing that as JSON would
// throw and leave the caller's loading state stuck forever. This always
// resolves to a `{ ok, error }`-shaped result instead.
export async function fetchJson<T>(
  input: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection and try again." };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON body (e.g. a 500 HTML error page) — fall through to the
    // generic message below.
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Something went wrong (${res.status}).`;
    return { ok: false, error: message };
  }

  return { ok: true, data: body as T };
}
