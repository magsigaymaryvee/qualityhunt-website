import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { configErrorResponse } from "@/lib/api-error";

type Params = { id: string };

// Approve (or un-approve) a review — the only field a moderator ever needs
// to change here.
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

  const { approved } = (body ?? {}) as { approved?: unknown };
  if (typeof approved !== "boolean") {
    return Response.json({ error: "approved must be a boolean." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("reviews").update({ approved }).eq("id", id);

    if (error) {
      console.error("Failed to update review:", error);
      return Response.json({ error: "Failed to update review." }, { status: 500 });
    }

    return Response.json({ ok: true });
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
    const { error } = await supabase.from("reviews").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete review:", error);
      return Response.json({ error: "Failed to delete review." }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return configErrorResponse(err);
  }
}
