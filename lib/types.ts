export type Board = {
  id: string;
  slug: string;
  kicker: string;
  title: string;
  intro: string;
  cover_image_url: string | null;
  published: boolean;
  position: number;
};

export type Product = {
  id: string;
  board_id: string;
  slug: string;
  tagline: string;
  name: string;
  description: string;
  image_url: string | null;
  buy_url: string | null;
  video_url: string | null;
  notes: string;
  reviews_url: string | null;
  position: number;
  // NULL = draft (never shown), a future time = scheduled, now/past = live.
  publish_at: string | null;
  // How many times the "Shop this" link has been clicked. Admin-only stat —
  // never shown to visitors.
  click_count: number;
};

export type Review = {
  id: string;
  product_id: string;
  name: string;
  rating: number;
  body: string;
  // Visitor-submitted reviews sit here unapproved until an admin reviews
  // them — see supabase/migrations/0012_reviews.sql.
  approved: boolean;
  created_at: string;
};

export type MediaType = "image" | "video";

export type ProductMedia = {
  id: string;
  product_id: string;
  media_type: MediaType;
  url: string;
  // Short label shown under the thumbnail. The longer caption only shows
  // once a viewer clicks through for more — same split as a Pinterest pin's
  // title vs. its description.
  title: string;
  caption: string;
  position: number;
};

// Turns a title into a URL-safe slug: "Cropped Jacket!" -> "cropped-jacket".
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
