import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import MediaCarousel from "@/app/components/MediaCarousel";
import CoverVideo from "@/app/components/CoverVideo";
import ShareButton from "@/app/components/ShareButton";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { site } from "@/lib/site";
import { parseVideoUrl } from "@/lib/video-embed";
import type { Board, Product, ProductMedia } from "@/lib/types";
import type { Metadata } from "next";

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, board_id, slug, tagline, name, description, image_url, buy_url, video_url, notes, reviews_url, position, publish_at"
      )
      .eq("slug", slug)
      // Excludes drafts (publish_at is null, which never satisfies <=) and
      // anything still scheduled for the future — a direct link shouldn't
      // work early just because someone has the URL.
      .lte("publish_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("Failed to load product:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("Supabase not configured:", err);
    return null;
  }
}

async function getMedia(productId: string): Promise<ProductMedia[]> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("product_media")
      .select("id, product_id, media_type, url, title, caption, position")
      .eq("product_id", productId)
      .order("position", { ascending: true });

    if (error) {
      console.error("Failed to load product media:", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("Supabase not configured:", err);
    return [];
  }
}

// A product only exists behind its published board.
async function getPublishedBoard(boardId: string): Promise<Board | null> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("boards")
      .select("id, slug, kicker, title, intro, cover_image_url, published, position")
      .eq("id", boardId)
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  return { title: product?.name ?? "Product" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const board = await getPublishedBoard(product.board_id);
  if (!board) notFound();

  const video = product.video_url ? parseVideoUrl(product.video_url) : null;
  const media = await getMedia(product.id);

  return (
    <>
      <SiteHeader />
      {/* pb-28 keeps the sticky mobile buy bar from covering the last of the copy. */}
      <main className={product.buy_url ? "flex-1 pb-28 lg:pb-0" : "flex-1"}>
        <section className="mx-auto max-w-6xl px-0 pb-10 pt-0 sm:px-8 sm:pt-8 lg:px-14 lg:pb-16">
          <div className="flex items-center justify-between px-4 sm:px-0">
            <Link
              href={`/boards/${board.slug}`}
              className="inline-flex min-h-11 items-center text-sm font-medium text-ink-soft hover:text-oxblood"
            >
              ← {board.title}
            </Link>
            <ShareButton title={product.name} image={product.image_url} />
          </div>

          <div className="mt-2 grid gap-6 sm:mt-4 lg:grid-cols-[minmax(0,1fr)_396px] lg:gap-12">
            {/* Cover photo: full-bleed on phones, rounded panel from sm up. */}
            <div className="aspect-[2/3] w-full overflow-hidden bg-line sm:rounded-2xl">
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- pasted retailer URLs, not a fixed next/image domain allowlist.
                <img
                  src={product.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-serif text-5xl text-taupe">
                  {product.name.slice(0, 1)}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 px-4 sm:px-0">
              {product.tagline && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-oxblood sm:text-xs sm:tracking-[0.1em]">
                  {product.tagline}
                </p>
              )}
              <h1 className="font-serif text-[30px] leading-[1.08] tracking-[-0.01em] sm:text-[36px] lg:text-[42px] lg:tracking-[-0.015em]">
                {product.name}
              </h1>
              {product.description && (
                <p className="max-w-prose text-sm leading-7 text-ink-soft sm:text-base">
                  {product.description}
                </p>
              )}

              {product.notes && (
                <div className="rounded-2xl bg-paper-2 p-4 shadow-[0_2px_8px_rgba(23,21,15,0.05)] sm:p-5">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-taupe">
                    Why we like it
                  </p>
                  <p className="max-w-prose text-[13px] leading-6 text-ink-soft sm:text-sm">
                    {product.notes}
                  </p>
                </div>
              )}

              {/* Desktop buy panel — the phone gets the sticky bar below instead. */}
              {product.buy_url && (
                <a
                  href={product.buy_url}
                  target="_blank"
                  rel="noopener sponsored"
                  className="hidden min-h-14 items-center justify-center rounded-full bg-forest px-6 text-base font-semibold text-on-forest transition hover:opacity-90 lg:inline-flex"
                >
                  Shop this
                </a>
              )}
              {product.reviews_url && (
                <a
                  href={product.reviews_url}
                  target="_blank"
                  rel="noopener sponsored"
                  className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-oxblood"
                >
                  See reviews on Amazon →
                </a>
              )}
              {product.buy_url && (
                <p className="hidden text-xs leading-5 text-taupe lg:block">
                  {site.affiliateDisclosure}
                </p>
              )}
            </div>
          </div>

          {media.length > 0 && (
            <div className="mt-10 px-4 sm:px-0 lg:mt-14">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-taupe">
                More looks
              </p>
              <MediaCarousel media={media} />
            </div>
          )}

          {video && product.video_url && (
            <div className="mx-auto mt-10 max-w-sm px-4 sm:px-0">
              <div className="aspect-[9/16] w-full overflow-hidden rounded-xl bg-paper-2 sm:rounded-2xl">
                <CoverVideo url={product.video_url} />
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Sticky buy bar — phones and tablets only. */}
      {product.buy_url && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/96 px-4 pb-4 pt-3 backdrop-blur-sm lg:hidden">
          <a
            href={product.buy_url}
            target="_blank"
            rel="noopener sponsored"
            className="flex min-h-13 items-center justify-center rounded-full bg-forest text-[15px] font-semibold text-on-forest"
          >
            Shop this
          </a>
          <p className="mt-1.5 text-center text-[10px] leading-4 text-taupe">
            {site.affiliateDisclosure}
          </p>
        </div>
      )}
      <SiteFooter />
    </>
  );
}
