# Quality Hunt — boards & products site

A public site for browsing your Pinterest-style **boards** (style guides,
edits, collections) and the **products** pinned inside each one. Clicking a
product opens its own page with a "Shop this" button that sends visitors to
an outside link (Amazon, Etsy, wherever you're linking to). You manage
everything — boards and products — from a passcode-protected `/admin` area;
nothing needs a code change to update.

- **Public site**: `/` (all boards) → `/boards/[slug]` (one board's products)
  → `/products/[slug]` (one product, with its outbound link)
- **Admin**: `/admin` (sign in) → `/admin/boards`, `/admin/products` (add,
  edit, delete, publish/unpublish)

## 1. Create a Supabase project

This site stores boards and products in [Supabase](https://supabase.com)
(a free tier is enough for a personal site).

1. Go to [supabase.com](https://supabase.com), sign in, and click **New
   project**. Pick any name/region and set a database password (you won't
   need it day-to-day).
2. Once it's ready, open **SQL Editor** → **New query**, and run every file
   in `supabase/migrations/` **in order** (paste contents, click Run,
   repeat) — they're numbered `0001`, `0002`, etc.
3. Open **Project Settings → API**. You'll need two values from this page
   in the next step:
   - **Project URL**
   - **service_role** key (under "Project API keys" — click reveal). This
     key is secret; the app only ever uses it on the server, never in the
     browser.

## 2. Configure environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env.local
```

```bash
# from Supabase Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# pick your own passcode for /admin, and a long random secret
ADMIN_PASSCODE=choose-a-passcode
ADMIN_SESSION_SECRET=a-long-random-string
```

Generate a good `ADMIN_SESSION_SECRET` with:

```bash
openssl rand -hex 32
```

`.env.local` is gitignored — it never gets committed.

## 3. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public site, and
[http://localhost:3000/admin](http://localhost:3000/admin) to sign in with
your `ADMIN_PASSCODE` and start adding boards and products.

A board won't appear on the public site until you check **Published** on it
in `/admin/boards` — so you can build a board out fully before it goes live.

## 4. Deploy on Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. In the project's **Environment Variables** settings, add the same four
   variables from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSCODE`, `ADMIN_SESSION_SECRET`).
4. Deploy. Every push to your main branch redeploys automatically.

Your live admin area will be at `https://your-site.vercel.app/admin`.

## How the data is shaped

- **Board**: `title`, `slug` (auto-generated from the title, editable),
  `kicker` (small label above the title, e.g. "Jackets & Outerwear · Style
  Guide"), `intro` (a sentence or two), `cover_image_url`, and `published`
  (unpublished boards are only visible in `/admin`).
- **Product**: belongs to one board. `name`, `slug`, `tagline` (small label,
  e.g. "Casual Weekend"), `description` (a styling tip or product blurb),
  `image_url` (cover photo, shown on the board grid card), and `buy_url` —
  the outside link the "Shop this" button opens. Leave `buy_url` empty and
  the button just won't show. There's deliberately no price field — Amazon
  prices move too often to keep an admin-entered price accurate. Also
  optional: `video_url` (your own video — YouTube, Vimeo, or a direct file
  link — embedded on the product page), `notes` (your own short "why we
  like it" take, never a copy of someone else's review), and `reviews_url`
  (a plain outbound link to the product's real reviews, e.g. on Amazon,
  instead of hosting any review content yourself).
- **Product photo**: a product can have any number of extra carousel photos
  (`product_photos` table), each with its own caption — e.g. a styling tip
  specific to that photo. Manage these from a product's edit view in
  `/admin/products`, once the product itself exists.

The `boards` and `products` tables both have a `position` number — lower
numbers show first. Set these from the edit form in `/admin` to reorder
boards or products within a board. `product_photos` also has its own
`position`, reordered with the ↑/↓ buttons in the carousel editor.

## Images

Both board cover photos and product photos are uploads — pick a file in
`/admin/boards` or `/admin/products` (JPEG, PNG, WebP, or GIF, up to 4MB)
and it's stored in Supabase Storage (`board-covers` and `product-images`
buckets respectively); the `cover_image_url`/`image_url` fields just hold
the resulting public URLs.

## Affiliate disclosure

`lib/site.ts` has a hardcoded FTC-style disclosure line
("As an Amazon Associate, Quality Hunt earns from qualifying purchases.")
shown in the footer and on any product page with a `buy_url`. Edit that file
directly if your program or wording changes — it's site-wide, not per-board.
