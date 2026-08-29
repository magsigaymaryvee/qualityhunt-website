-- Extra photos for a product's detail-page carousel, each with its own
-- caption (e.g. a styling tip specific to that photo). The product's own
-- `image_url` stays the single cover photo shown on the board grid card —
-- this table is purely the additional carousel images.
create table if not exists product_photos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  caption text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_photos_product_id_idx on product_photos(product_id, position);

alter table product_photos enable row level security;
