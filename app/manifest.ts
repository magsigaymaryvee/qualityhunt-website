import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Makes the whole app (public pages and /admin alike — it's one domain,
// one install) installable from Chrome on Android as a standalone app:
// its own icon, no browser address bar, launches straight in.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#ede6d4",
    theme_color: "#5b5730",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
