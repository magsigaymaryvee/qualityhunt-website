import { getSupabaseServerClient } from "@/lib/supabase-server";
import { configErrorResponse } from "@/lib/api-error";
import { clientIp } from "@/lib/client-ip";
import { isReviewRateLimited, recordReviewAttempt } from "@/lib/reviews";

const MAX_NAME_LENGTH = 80;
const MAX_BODY_LENGTH = 2000;

// Public, unauthenticated — this is how any visitor leaves a review. Rows
// land with approved: false (the column default) and never appear on the
// site until an admin approves them from /admin/reviews.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    product_id,
    name,
    rating,
    body: reviewBody,
  } = (body ?? {}) as {
    product_id?: unknown;
    name?: unknown;
    rating?: unknown;
    body?: unknown;
  };

  if (typeof product_id !== "string" || !product_id) {
    return Response.json({ error: "product_id is required." }, { status: 400 });
  }
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: "rating must be a whole number from 1 to 5." }, { status: 400 });
  }
  if (typeof reviewBody !== "string" || !reviewBody.trim()) {
    return Response.json({ error: "A review needs some text." }, { status: 400 });
  }
  if (reviewBody.length > MAX_BODY_LENGTH) {
    return Response.json({ error: "That review is too long." }, { status: 400 });
  }
  if (typeof name === "string" && name.length > MAX_NAME_LENGTH) {
    return Response.json({ error: "That name is too long." }, { status: 400 });
  }

  const ip = clientIp(request);
  if (await isReviewRateLimited(ip)) {
    return Response.json(
      { error: "Too many reviews submitted recently. Try again later." },
      { status: 429 }
    );
  }

  try {
    const supabase = getSupabaseServerClient();

    // Confirms the product is real (and live) before accepting a review for
    // it, so junk product_ids fail cleanly instead of via a foreign key
    // error, and reviews can't pile up under a draft nobody can see yet.
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", product_id)
      .lte("publish_at", new Date().toISOString())
      .maybeSingle();

    if (productError) {
      console.error("Failed to look up product for review:", productError);
      return Response.json({ error: "Failed to submit review." }, { status: 500 });
    }
    if (!product) {
      return Response.json({ error: "That product doesn't exist." }, { status: 404 });
    }

    await recordReviewAttempt(ip);

    const { error } = await supabase.from("reviews").insert({
      product_id,
      name: typeof name === "string" ? name.trim() : "",
      rating,
      body: reviewBody.trim(),
    });

    if (error) {
      console.error("Failed to submit review:", error);
      return Response.json({ error: "Failed to submit review." }, { status: 500 });
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    return configErrorResponse(err);
  }
}
