import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { uniqueSlug } from "@/lib/slug-server";
import { configErrorResponse } from "@/lib/api-error";

const SELECT =
  "id, board_id, slug, tagline, name, description, image_url, buy_url, video_url, notes, reviews_url, position, publish_at, click_count";

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const boardId = new URL(request.url).searchParams.get("board_id");

  try {
    const supabase = getSupabaseServerClient();
    let query = supabase.from("products").select(SELECT).order("position", { ascending: true });
    if (boardId) query = query.eq("board_id", boardId);

    const { data, error } = await query;

    if (error) {
      console.error("Failed to load products:", error);
      return Response.json({ error: "Failed to load products." }, { status: 500 });
    }

    return Response.json({ products: data ?? [] });
  } catch (err) {
    return configErrorResponse(err);
  }
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

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

  if (typeof board_id !== "string" || !board_id) {
    return Response.json({ error: "board_id is required." }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "name is required." }, { status: 400 });
  }
  // null = save as a draft. Omitted entirely = publish immediately, so
  // callers that don't know about scheduling yet keep today's behavior.
  if (publish_at !== undefined && publish_at !== null && typeof publish_at !== "string") {
    return Response.json({ error: "publish_at must be a string or null." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const resolvedSlug = await uniqueSlug(
      supabase,
      "products",
      typeof slug === "string" && slug.trim() ? slug : name
    );

    const { data, error } = await supabase
      .from("products")
      .insert({
        board_id,
        name: name.trim(),
        slug: resolvedSlug,
        tagline: typeof tagline === "string" ? tagline.trim() : "",
        description: typeof description === "string" ? description.trim() : "",
        image_url: typeof image_url === "string" && image_url.trim() ? image_url.trim() : null,
        buy_url: typeof buy_url === "string" && buy_url.trim() ? buy_url.trim() : null,
        video_url: typeof video_url === "string" && video_url.trim() ? video_url.trim() : null,
        notes: typeof notes === "string" ? notes.trim() : "",
        reviews_url:
          typeof reviews_url === "string" && reviews_url.trim() ? reviews_url.trim() : null,
        position: typeof position === "number" ? position : 0,
        publish_at: publish_at === undefined ? new Date().toISOString() : publish_at,
      })
      .select(SELECT)
      .single();

    if (error) {
      console.error("Failed to create product:", error);
      return Response.json({ error: "Failed to create product." }, { status: 500 });
    }

    return Response.json({ product: data }, { status: 201 });
  } catch (err) {
    return configErrorResponse(err);
  }
}
