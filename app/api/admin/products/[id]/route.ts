import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { uniqueSlug } from "@/lib/slug-server";
import { configErrorResponse } from "@/lib/api-error";

const SELECT =
  "id, board_id, slug, tagline, name, description, image_url, buy_url, video_url, notes, reviews_url, position, publish_at, click_count";

type Params = { id: string };

export async function PATCH(request: Request, context: { params: Promise<Params> }) {
  if (!(await isAdminSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    board_id,
    name,
    tagline,
    description,
    image_url,
    buy_url,
    video_url,
    notes,
    reviews_url,
    position,
    slug,
    publish_at,
  } = (body ?? {}) as {
    board_id?: unknown;
    name?: unknown;
    tagline?: unknown;
    description?: unknown;
    image_url?: unknown;
    buy_url?: unknown;
    video_url?: unknown;
    notes?: unknown;
    reviews_url?: unknown;
    position?: unknown;
    slug?: unknown;
    publish_at?: unknown;
  };

  try {
    const supabase = getSupabaseServerClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (board_id !== undefined) {
      if (typeof board_id !== "string" || !board_id) {
        return Response.json({ error: "board_id must be a non-empty string." }, { status: 400 });
      }
      patch.board_id = board_id;
    }
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return Response.json({ error: "name must be a non-empty string." }, { status: 400 });
      }
      patch.name = name.trim();
    }
    if (slug !== undefined) {
      if (typeof slug !== "string" || !slug.trim()) {
        return Response.json({ error: "slug must be a non-empty string." }, { status: 400 });
      }
      patch.slug = await uniqueSlug(supabase, "products", slug, id);
    }
    if (tagline !== undefined) {
      patch.tagline = typeof tagline === "string" ? tagline.trim() : "";
    }
    if (description !== undefined) {
      patch.description = typeof description === "string" ? description.trim() : "";
    }
    if (image_url !== undefined) {
      patch.image_url =
        typeof image_url === "string" && image_url.trim() ? image_url.trim() : null;
    }
    if (buy_url !== undefined) {
      patch.buy_url = typeof buy_url === "string" && buy_url.trim() ? buy_url.trim() : null;
    }
    if (video_url !== undefined) {
      patch.video_url = typeof video_url === "string" && video_url.trim() ? video_url.trim() : null;
    }
    if (notes !== undefined) {
      patch.notes = typeof notes === "string" ? notes.trim() : "";
    }
    if (reviews_url !== undefined) {
      patch.reviews_url =
        typeof reviews_url === "string" && reviews_url.trim() ? reviews_url.trim() : null;
    }
    if (position !== undefined) {
      if (typeof position !== "number") {
        return Response.json({ error: "position must be a number." }, { status: 400 });
      }
      patch.position = position;
    }
    if (publish_at !== undefined) {
      if (publish_at !== null && typeof publish_at !== "string") {
        return Response.json(
          { error: "publish_at must be a string or null." },
          { status: 400 }
        );
      }
      patch.publish_at = publish_at;
    }

    const { data, error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error) {
      console.error("Failed to update product:", error);
      return Response.json({ error: "Failed to update product." }, { status: 500 });
    }

    return Response.json({ product: data });
  } catch (err) {
    return configErrorResponse(err);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<Params> }) {
  if (!(await isAdminSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete product:", error);
      return Response.json({ error: "Failed to delete product." }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return configErrorResponse(err);
  }
}
