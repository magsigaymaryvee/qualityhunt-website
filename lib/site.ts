// Site-wide constants. Edit these directly (not in the database) — they
// rarely change and don't need an admin form.
export const site = {
  name: "Quality Hunt",
  tagline: "Style guides and finds, curated one board at a time.",
  // Used by robots.ts/sitemap.ts to build absolute URLs. Set
  // NEXT_PUBLIC_SITE_URL once the real domain is live on Vercel — this
  // placeholder just keeps local dev working without it.
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://qualityhunt.example.com",
  pinterestUrl: "https://ph.pinterest.com/qualityhunt2026/",
  contactEmail: "qualityhunt2026@gmail.com",
  // Shown in the footer, and on any board/product page that has outbound
  // shopping links. Required wording for the Amazon Associates program —
  // update if you add other affiliate programs.
  affiliateDisclosure:
    "As an Amazon Associate, Quality Hunt earns from qualifying purchases.",
};
