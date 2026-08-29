import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The admin CMS has no public content to index, and shouldn't
        // appear in search results for the passcode screen.
        disallow: ["/admin"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
