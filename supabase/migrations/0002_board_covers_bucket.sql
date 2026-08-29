-- Storage bucket for uploaded board cover photos. Run this in the Supabase
-- SQL editor the same way as 0001_init.sql.
--
-- "public: true" means anyone can view/download an object by its public URL
-- (no auth needed) — that's what lets the object show up as an <img> on the
-- public site. Uploads still only ever happen from the server using the
-- service role key (see app/api/admin/upload), which bypasses storage RLS
-- entirely, so no extra policy is needed for writes either.
insert into storage.buckets (id, name, public)
values ('board-covers', 'board-covers', true)
on conflict (id) do nothing;
