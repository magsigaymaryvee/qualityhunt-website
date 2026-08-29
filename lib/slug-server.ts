import "server-only";
import type { PostgrestClient } from "@supabase/postgrest-js";
import { slugify } from "@/lib/types";

// Turns "Cropped Jacket" into a slug that doesn't collide with an existing
// row in `table` — "cropped-jacket", or "cropped-jacket-2" if taken, etc.
// `excludeId` lets an update keep its own current slug without tripping the
// collision check against itself.
export async function uniqueSlug(
  supabase: PostgrestClient,
  table: "boards" | "products",
  base: string,
  excludeId?: string
): Promise<string> {
  const root = slugify(base) || "item";
  let candidate = root;
  let suffix = 2;

  // Small tables (personal boards/products), so a loop of point lookups is
  // simple and fast enough — no need for a single fancy query.
  for (;;) {
    let query = supabase.from(table).select("id").eq("slug", candidate).limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return candidate;
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }
}
