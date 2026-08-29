import Link from "next/link";
import { isAdminSession } from "@/lib/admin-auth";
import AdminLoginForm from "@/app/admin/AdminLoginForm";
import AdminShell from "@/app/admin/AdminShell";
import { site } from "@/lib/site";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Board } from "@/lib/types";
import BoardRowActions from "@/app/admin/BoardRowActions";
import ClicksOverview from "@/app/admin/ClicksOverview";

export const metadata = { title: "Admin" };

async function getBoards(): Promise<Board[]> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("boards")
      .select("id, slug, kicker, title, intro, cover_image_url, published, position")
      .order("position", { ascending: true });

    if (error) {
      console.error("Failed to load boards:", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("Supabase not configured:", err);
    return [];
  }
}

type Stats = { products: number; clicks: number; pendingReviews: number };

// A small "Overall performance" summary, in the spirit of Pinterest's own
// analytics overview — just scoped to what this site actually tracks
// (there's no impressions/audience data without Pinterest's own reach).
async function getStats(): Promise<Stats> {
  try {
    const supabase = getSupabaseServerClient();
    const [productsResult, pendingReviewsResult] = await Promise.all([
      supabase.from("products").select("click_count"),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("approved", false),
    ]);

    if (productsResult.error) {
      console.error("Failed to load product stats:", productsResult.error);
    }
    if (pendingReviewsResult.error) {
      console.error("Failed to load review stats:", pendingReviewsResult.error);
    }

    const products = productsResult.data ?? [];
    return {
      products: products.length,
      clicks: products.reduce((sum, p) => sum + (p.click_count ?? 0), 0),
      pendingReviews: pendingReviewsResult.count ?? 0,
    };
  } catch (err) {
    console.error("Supabase not configured:", err);
    return { products: 0, clicks: 0, pendingReviews: 0 };
  }
}

export default async function AdminPage() {
  const signedIn = await isAdminSession();

  if (!signedIn) {
    return (
      <main className="flex min-h-screen w-full flex-col justify-center bg-forest px-6 py-16 text-on-forest sm:px-10">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-forest-soft">
            {site.name} Admin
          </p>
          <h1 className="font-serif text-[34px] leading-[1.05] sm:text-4xl">
            Enter your passcode
          </h1>
          <AdminLoginForm />
        </div>
      </main>
    );
  }

  const boards = await getBoards();
  const stats = await getStats();

  return (
    <AdminShell current="dashboard" title="Dashboard">
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl bg-paper-2 p-5 shadow-[0_2px_8px_rgba(23,21,15,0.05)] sm:p-6">
          <h2 className="font-serif text-xl text-ink">Overall performance</h2>
          <p className="mt-1 text-xs text-taupe">Updated in real time.</p>
          <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Stat label="Boards" value={boards.length} />
            <Stat label="Products" value={stats.products} />
            <Stat label="Outbound clicks" value={stats.clicks} />
            <Stat
              label="Reviews to approve"
              value={stats.pendingReviews}
              href="/admin/reviews"
            />
          </div>
        </div>

        <ClicksOverview boards={boards} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link
            href="/admin/boards"
            className="flex min-h-15 items-center justify-between rounded-2xl bg-paper-2 px-4 py-4 shadow-[0_2px_8px_rgba(23,21,15,0.05)] transition hover:shadow-[0_6px_18px_rgba(23,21,15,0.09)]"
          >
            <span className="text-[15px] font-semibold">Boards</span>
            <span className="text-oxblood">→</span>
          </Link>
          <Link
            href="/admin/products"
            className="flex min-h-15 items-center justify-between rounded-2xl bg-paper-2 px-4 py-4 shadow-[0_2px_8px_rgba(23,21,15,0.05)] transition hover:shadow-[0_6px_18px_rgba(23,21,15,0.09)]"
          >
            <span className="text-[15px] font-semibold">Products</span>
            <span className="text-oxblood">→</span>
          </Link>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 flex min-h-15 items-center justify-between rounded-2xl bg-forest px-4 py-4 text-on-forest sm:col-span-1"
          >
            <span className="text-[15px] font-semibold">View site</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        <p className="text-[13px] leading-6 text-taupe">
          Boards stay off the public site until you tick <em>Published</em>.
        </p>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-xs uppercase tracking-[0.14em] text-taupe">
              Existing boards
            </h2>
            <Link
              href="/admin/boards"
              className="font-sans text-xs uppercase tracking-[0.1em] text-oxblood hover:underline"
            >
              Manage →
            </Link>
          </div>
          {boards.length === 0 ? (
            <p className="font-sans text-sm text-taupe">No boards yet — add one.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {boards.map((board) => (
                <li
                  key={board.id}
                  className="flex items-center justify-between gap-4 rounded-sm border border-line bg-paper-2 px-4 py-3"
                >
                  <Link
                    href={`/admin/products?board_id=${board.id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="font-sans text-sm font-semibold hover:text-oxblood">
                      {board.title}{" "}
                      {!board.published && (
                        <span className="ml-1 font-sans text-[11px] uppercase tracking-[0.1em] text-taupe">
                          (draft)
                        </span>
                      )}
                    </p>
                    <p className="font-sans text-xs text-taupe">
                      /boards/{board.slug} — view products
                    </p>
                  </Link>
                  <BoardRowActions board={board} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <>
      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-taupe">
        {label}
      </p>
      <p className="mt-1 font-serif text-3xl text-ink">{value.toLocaleString()}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-lg transition hover:opacity-70">
        {content}
      </Link>
    );
  }
  return <div>{content}</div>;
}
