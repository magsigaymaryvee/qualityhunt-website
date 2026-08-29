import type { MetadataRoute } from "next";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { site } from "@/lib/site";

// Otherwise this gets frozen at build time too, same issue as the
// homepage — new boards/products wouldn't reach search engines until the
// next deploy.
export const dynamic = "force-dynamic";

// Same visibility rules as the public pages themselves: only published
// boards, and only products whose publish_at has actually arrived — a
// draft or still-scheduled item shouldn't be handed to search engines
// just because it exists in the database.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [{ url: site.url, changeFrequency: "weekly", priority: 1 }];

  try {
    const supabase = getSupabaseServerClient();

    const { data: boards } = await supabase
      .from("boards")
      .select("slug")
      .eq("published", true);

    for (const board of boards ?? []) {
      entries.push({
        url: `${site.url}/boards/${board.slug}`,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    const { data: products } = await supabase
      .from("products")
      .select("slug")
      .lte("publish_at", new Date().toISOString());

    for (const product of products ?? []) {
      entries.push({
        url: `${site.url}/products/${product.slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.error("Failed to build sitemap:", err);
  }

  return entries;
}
