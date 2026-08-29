import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { configErrorResponse } from "@/lib/api-error";

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<string, number | null> = { "7": 7, "30": 30, "90": 90, all: null };

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Powers the Dashboard's outbound-clicks graph: a day-by-day series (every
// day filled in, even zero-click ones, so the graph reads as a continuous
// timeline) plus the total for whatever range/board is selected.
export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "30";
  const boardId = url.searchParams.get("board_id");

  if (!(range in RANGE_DAYS)) {
    return Response.json({ error: "Invalid range." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    // !inner turns the board filter below into an actual join condition —
    // without it, .eq("products.board_id", ...) is silently ignored by
    // postgrest on a left join.
    let query = supabase
      .from("product_clicks")
      .select("created_at, products!inner(board_id)")
      .order("created_at", { ascending: true });

    const days = RANGE_DAYS[range];
    if (days !== null) {
      query = query.gte("created_at", new Date(Date.now() - days * DAY_MS).toISOString());
    }
    if (boardId) {
      query = query.eq("products.board_id", boardId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to load click stats:", error);
      return Response.json({ error: "Failed to load click stats." }, { status: 500 });
    }

    const rows = (data ?? []) as { created_at: string }[];
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = row.created_at.slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    // "all" has no fixed window — span from the earliest click on record to
    // today instead, or zero days (an empty series) if there's no data yet.
    let spanDays = days;
    if (spanDays === null) {
      const earliest = [...counts.keys()].sort()[0];
      spanDays = earliest
        ? Math.round((Date.now() - new Date(earliest).getTime()) / DAY_MS) + 1
        : 0;
    }

    const series: { date: string; clicks: number }[] = [];
    for (let i = spanDays - 1; i >= 0; i--) {
      const key = dateKey(new Date(Date.now() - i * DAY_MS));
      series.push({ date: key, clicks: counts.get(key) ?? 0 });
    }

    const total = series.reduce((sum, point) => sum + point.clicks, 0);

    return Response.json({ total, series });
  } catch (err) {
    return configErrorResponse(err);
  }
}
