import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { uniqueSlug } from "@/lib/slug-server";
import { configErrorResponse } from "@/lib/api-error";

const SELECT = "id, slug, kicker, title, intro, cover_image_url, published, position";

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

  const { title, kicker, intro, cover_image_url, published, position, slug } = (body ?? {}) as {
    title?: unknown;
    kicker?: unknown;
    intro?: unknown;
    cover_image_url?: unknown;
    published?: unknown;
    position?: unknown;
    slug?: unknown;
  };

  try {
    const supabase = getSupabaseServerClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return Response.json({ error: "title must be a non-empty string." }, { status: 400 });
      }
      patch.title = title.trim();
    }
    if (slug !== undefined) {
      if (typeof slug !== "string" || !slug.trim()) {
        return Response.json({ error: "slug must be a non-empty string." }, { status: 400 });
      }
      patch.slug = await uniqueSlug(supabase, "boards", slug, id);
    }
    if (kicker !== undefined) {
      patch.kicker = typeof kicker === "string" ? kicker.trim() : "";
    }
    if (intro !== undefined) {
      patch.intro = typeof intro === "string" ? intro.trim() : "";
    }
    if (cover_image_url !== undefined) {
      patch.cover_image_url =
        typeof cover_image_url === "string" && cover_image_url.trim()
          ? cover_image_url.trim()
          : null;
    }
    if (published !== undefined) {
      patch.published = published === true;
    }
    if (position !== undefined) {
      if (typeof position !== "number") {
        return Response.json({ error: "position must be a number." }, { status: 400 });
      }
      patch.position = position;
    }

    const { data, error } = await supabase
      .from("boards")
      .update(patch)
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error) {
      console.error("Failed to update board:", error);
      return Response.json({ error: "Failed to update board." }, { status: 500 });
    }

    return Response.json({ board: data });
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
    // Products reference boards with ON DELETE CASCADE, so this also removes
    // every product pinned to the board.
    const { error } = await supabase.from("boards").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete board:", error);
      return Response.json({ error: "Failed to delete board." }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return configErrorResponse(err);
  }
}
