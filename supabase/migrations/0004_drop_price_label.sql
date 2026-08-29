-- Products no longer show a price (Amazon prices move too often to keep an
-- admin-entered price_label accurate, and several links go to search
-- results rather than one fixed listing). Run this in the Supabase SQL
-- editor the same way as the earlier migrations.
alter table products drop column if exists price_label;
