import "server-only";
import { PostgrestClient } from "@supabase/postgrest-js";

// Server-only client using the service role (secret) key, which bypasses Row
// Level Security. Never import this file from a "use client" component — the
// "server-only" import above makes that a build-time error.
//
// This uses @supabase/postgrest-js directly instead of the full
// @supabase/supabase-js createClient(). We only need table reads/writes (no
// auth, storage, or realtime), and supabase-js unconditionally constructs a
// realtime (WebSocket) client even when unused — which throws on Node < 22
// ("native WebSocket not found"). PostgrestClient has no such dependency and
// behaves identically for .from(table).select()/.insert() calls.
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  return new PostgrestClient(`${url}/rest/v1`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
}
