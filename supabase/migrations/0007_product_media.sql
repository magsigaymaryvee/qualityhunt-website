-- Generalizes the product photo carousel into a mixed media carousel: each
-- item is now either an image or a video, in one reorderable list.
alter table product_photos rename to product_media;
alter table product_media rename column image_url to url;
alter table product_media add column if not exists media_type text not null default 'image';
alter table product_media add constraint product_media_media_type_check
  check (media_type in ('image', 'video'));

-- Storage bucket for uploaded video files (separate from product-images
-- since videos need a much bigger size cap). Videos upload directly from
-- the browser to Supabase Storage via a short-lived signed URL — never
-- through our server — so this cap is enforced by Supabase itself, not
-- just client-side.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-videos',
  'product-videos',
  true,
  52428800, -- 50MB
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
