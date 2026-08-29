import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { configErrorResponse } from "@/lib/api-error";

// Pulls in the product's name/slug alongside each review via Postgres's
// foreign key (reviews.product_id -> products.id) — postgrest-js resolves
// that as an embedded resource without a separate query.
const SELECT = "id, product_id, name, rating, body, approved, created_at, products(name, slug)";

export async function GET() {
  if (!(await isAdminSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("reviews")
      .select(SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load reviews:", error);
      return Response.json({ error: "Failed to load reviews." }, { status: 500 });
    }

    return Response.json({ reviews: data ?? [] });
  } catch (err) {
    return configErrorResponse(err);
  }
}
