import { getSupabaseServerClient } from "@/lib/supabase-server";
import { configErrorResponse } from "@/lib/api-error";

// Public, unauthenticated on purpose — every visitor who taps "Shop this"
// hits this, not just the admin. It only ever increments a counter on an
// existing product row, so there's nothing here worth protecting behind a
// login. Sent via navigator.sendBeacon from BuyButton, which is why the
// body isn't necessarily JSON-content-typed — request.json() doesn't care.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { product_id } = (body ?? {}) as { product_id?: unknown };
  if (typeof product_id !== "string" || !product_id) {
    return Response.json({ error: "product_id is required." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const [{ error: rpcError }, { error: logError }] = await Promise.all([
      supabase.rpc("increment_product_click", { p_product_id: product_id }),
      // Individually timestamped, unlike the running total above — this is
      // what lets the admin's outbound-clicks graph show a trend instead of
      // just a single ever-growing number.
      supabase.from("product_clicks").insert({ product_id }),
    ]);

    if (rpcError) {
      console.error("Failed to record click:", rpcError);
      return Response.json({ error: "Failed to record click." }, { status: 500 });
    }
    if (logError) {
      // The counter above already succeeded — don't fail the whole request
      // over the graph's log entry, just note it.
      console.error("Failed to log click for graph:", logError);
    }

    return Response.json({ ok: true });
  } catch (err) {
    return configErrorResponse(err);
  }
}
