import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import BoardCard from "@/app/components/BoardCard";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { site } from "@/lib/site";
import type { Board } from "@/lib/types";

// Without this, Next.js prerenders the homepage once at deploy time and
// serves that same frozen board list to everyone until the next deploy —
// so adding, hiding, or deleting a board in the admin would silently not
// show up on the live site until a redeploy. This page has no dynamic
// segments (unlike /boards/[slug]), so it would otherwise default to
// exactly that kind of static caching.
export const dynamic = "force-dynamic";

async function getPublishedBoards(): Promise<Board[]> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("boards")
      .select("id, slug, kicker, title, intro, cover_image_url, published, position")
      .eq("published", true)
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

export default async function HomePage() {
  const boards = await getPublishedBoards();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-8 sm:pb-8 sm:pt-16 lg:px-14 lg:pt-24">
          <h1 className="max-w-3xl font-serif text-[38px] leading-[1.02] tracking-[-0.015em] sm:text-[54px] lg:text-7xl lg:tracking-[-0.025em]">
            {site.tagline.replace(/\.$/, "")
              .split(",")
              .map((part, i) =>
                i === 0 ? (
                  <span key={i}>{part},</span>
                ) : (
                  <span key={i} className="text-oxblood">
                    {part}.
                  </span>
                )
              )}
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-ink-soft sm:mt-5 sm:text-base sm:leading-7">
            {boards.length > 0
              ? `${boards.length} board${boards.length === 1 ? "" : "s"} of things we actually use.`
              : "Boards are on the way."}
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8 sm:pb-24 lg:px-14">
          {boards.length === 0 ? (
            <p className="border-t border-line py-12 text-sm text-taupe sm:py-16">
              No boards published yet — check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
              {boards.map((board) => (
                <BoardCard key={board.id} board={board} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
