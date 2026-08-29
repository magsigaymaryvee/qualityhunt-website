-- Storage bucket for uploaded product photos. Run this in the Supabase SQL
-- editor the same way as the earlier migrations. See 0002_board_covers_bucket.sql
-- for why no extra RLS policy is needed.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
