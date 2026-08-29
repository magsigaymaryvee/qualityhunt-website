-- Three optional product fields:
-- - video_url: a video you own/host (YouTube, Vimeo, or a direct file URL) —
--   embedded on the product page if set.
-- - notes: your own short "why we like it" take — never a copy of someone
--   else's review text.
-- - reviews_url: a plain outbound link to the product's real reviews on
--   Amazon (or wherever), instead of hosting any review content yourself.
alter table products add column if not exists video_url text;
alter table products add column if not exists notes text not null default '';
alter table products add column if not exists reviews_url text;
