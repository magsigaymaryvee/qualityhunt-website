import { notFound } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import ProductCard from "@/app/components/ProductCard";
import ShareButton from "@/app/components/ShareButton";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Board, Product } from "@/lib/types";
import type { Metadata } from "next";

// Explicit, not relied-upon-by-default: makes sure a board's product list
// always reflects the latest admin changes rather than a stale prerendered
// copy, regardless of how this route's caching behavior might change later.
export const dynamic = "force-dynamic";

async function getBoard(slug: string): Promise<Board | null> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("boards")
      .select("id, slug, kicker, title, intro, cover_image_url, published, position")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (error) {
      console.error("Failed to load board:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("Supabase not configured:", err);
    return null;
  }
}

async function getProducts(boardId: string): Promise<Product[]> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, board_id, slug, tagline, name, description, image_url, buy_url, video_url, notes, reviews_url, position, publish_at, click_count"
      )
      .eq("board_id", boardId)
      // Excludes drafts (publish_at is null, which never satisfies <=) and
      // anything still scheduled for the future.
      .lte("publish_at", new Date().toISOString())
      .order("position", { ascending: true });

    if (error) {
      console.error("Failed to load products:", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("Supabase not configured:", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoard(slug);
  return { title: board?.title ?? "Board" };
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = await getBoard(slug);
  if (!board) notFound();

  const products = await getProducts(board.id);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-5 pt-8 sm:px-8 sm:pt-14 lg:px-14 lg:pb-7 lg:pt-16">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center text-sm font-medium text-ink-soft hover:text-oxblood"
            >
              ← All boards
            </Link>
            <ShareButton title={board.title} image={board.cover_image_url} />
          </div>
          <div className="mt-2 lg:flex lg:items-end lg:justify-between lg:gap-10">
            <div className="max-w-2xl">
              {board.kicker && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-oxblood sm:text-xs sm:tracking-[0.1em]">
                  {board.kicker}
                </p>
              )}
              <h1 className="mt-2 font-serif text-[32px] leading-[1.05] tracking-[-0.01em] sm:text-[42px] lg:text-[52px] lg:tracking-[-0.02em]">
                {board.title}
              </h1>
              {board.intro && (
                <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft sm:text-base sm:leading-7">
                  {board.intro}
                </p>
              )}
            </div>
            <p className="mt-3 shrink-0 text-xs text-taupe lg:mb-2 lg:mt-0">
              {products.length} pin{products.length === 1 ? "" : "s"}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8 sm:pb-24 lg:px-14">
          {products.length === 0 ? (
            <p className="border-t border-line py-12 text-sm text-taupe sm:py-16">
              Nothing pinned to this board yet.
            </p>
          ) : (
            <div className="columns-2 gap-3 sm:columns-3 sm:gap-5 lg:columns-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
