import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { configErrorResponse } from "@/lib/api-error";

const SELECT = "id, product_id, media_type, url, title, caption, position";

type Params = { id: string };

export async function GET(_request: Request, context: { params: Promise<Params> }) {
  if (!(await isAdminSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id: productId } = await context.params;

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("product_media")
      .select(SELECT)
      .eq("product_id", productId)
      .order("position", { ascending: true });

    if (error) {
      console.error("Failed to load product media:", error);
      return Response.json({ error: "Failed to load media." }, { status: 500 });
    }

    return Response.json({ media: data ?? [] });
  } catch (err) {
    return configErrorResponse(err);
  }
}

export async function POST(request: Request, context: { params: Promise<Params> }) {
  if (!(await isAdminSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id: productId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { media_type, url, title, caption } = (body ?? {}) as {
    media_type?: unknown;
    url?: unknown;
    title?: unknown;
    caption?: unknown;
  };

  if (media_type !== "image" && media_type !== "video") {
    return Response.json({ error: "media_type must be 'image' or 'video'." }, { status: 400 });
  }
  if (typeof url !== "string" || !url.trim()) {
    return Response.json({ error: "url is required." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();

    // New item goes at the end — one point query for the current count is
    // simple and fine at this scale (a handful of media items per product).
    const { count, error: countError } = await supabase
      .from("product_media")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);

    if (countError) {
      console.error("Failed to count product media:", countError);
      return Response.json({ error: "Failed to add media." }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("product_media")
      .insert({
        product_id: productId,
        media_type,
        url: url.trim(),
        title: typeof title === "string" ? title.trim() : "",
        caption: typeof caption === "string" ? caption.trim() : "",
        position: count ?? 0,
      })
      .select(SELECT)
      .single();

    if (error) {
      console.error("Failed to create product media:", error);
      return Response.json({ error: "Failed to add media." }, { status: 500 });
    }

    return Response.json({ media: data }, { status: 201 });
  } catch (err) {
    return configErrorResponse(err);
  }
}
