import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { uniqueSlug } from "@/lib/slug-server";
import { configErrorResponse } from "@/lib/api-error";

const SELECT = "id, slug, kicker, title, intro, cover_image_url, published, position";

export async function GET() {
  if (!(await isAdminSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("boards")
      .select(SELECT)
      .order("position", { ascending: true });

    if (error) {
      console.error("Failed to load boards:", error);
      return Response.json({ error: "Failed to load boards." }, { status: 500 });
    }

    return Response.json({ boards: data ?? [] });
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

  const { title, kicker, intro, cover_image_url, published, position, slug } = (body ?? {}) as {
    title?: unknown;
    kicker?: unknown;
    intro?: unknown;
    cover_image_url?: unknown;
    published?: unknown;
    position?: unknown;
    slug?: unknown;
  };

  if (typeof title !== "string" || !title.trim()) {
    return Response.json({ error: "title is required." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const resolvedSlug = await uniqueSlug(
      supabase,
      "boards",
      typeof slug === "string" && slug.trim() ? slug : title
    );

    const { data, error } = await supabase
      .from("boards")
      .insert({
        title: title.trim(),
        slug: resolvedSlug,
        kicker: typeof kicker === "string" ? kicker.trim() : "",
        intro: typeof intro === "string" ? intro.trim() : "",
        cover_image_url:
          typeof cover_image_url === "string" && cover_image_url.trim()
            ? cover_image_url.trim()
            : null,
        published: published === true,
        position: typeof position === "number" ? position : 0,
      })
      .select(SELECT)
      .single();

    if (error) {
      console.error("Failed to create board:", error);
      return Response.json({ error: "Failed to create board." }, { status: 500 });
    }

    return Response.json({ board: data }, { status: 201 });
  } catch (err) {
    return configErrorResponse(err);
  }
}
