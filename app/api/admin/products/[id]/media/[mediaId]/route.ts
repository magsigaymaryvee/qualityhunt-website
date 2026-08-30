import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { configErrorResponse } from "@/lib/api-error";

const SELECT = "id, product_id, media_type, url, title, caption, position";

type Params = { id: string; mediaId: string };

export async function PATCH(request: Request, context: { params: Promise<Params> }) {
  if (!(await isAdminSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { mediaId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { title, caption, position, url } = (body ?? {}) as {
    title?: unknown;
    caption?: unknown;
    position?: unknown;
    url?: unknown;
  };
  const patch: Record<string, unknown> = {};

  if (title !== undefined) {
    patch.title = typeof title === "string" ? title.trim() : "";
  }
  if (caption !== undefined) {
    patch.caption = typeof caption === "string" ? caption.trim() : "";
  }
  if (position !== undefined) {
    if (typeof position !== "number") {
      return Response.json({ error: "position must be a number." }, { status: 400 });
    }
    patch.position = position;
  }
  if (url !== undefined) {
    // Lets re-cropping an already-uploaded photo replace it in place,
    // instead of only ever being settable at creation time.
    if (typeof url !== "string" || !url.trim()) {
      return Response.json({ error: "url must be a non-empty string." }, { status: 400 });
    }
    patch.url = url.trim();
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("product_media")
      .update(patch)
      .eq("id", mediaId)
      .select(SELECT)
      .single();

    if (error) {
      console.error("Failed to update product media:", error);
      return Response.json({ error: "Failed to update media." }, { status: 500 });
    }

    return Response.json({ media: data });
  } catch (err) {
    return configErrorResponse(err);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<Params> }) {
  if (!(await isAdminSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { mediaId } = await context.params;

  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("product_media").delete().eq("id", mediaId);

    if (error) {
      console.error("Failed to delete product media:", error);
      return Response.json({ error: "Failed to delete media." }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return configErrorResponse(err);
  }
}
