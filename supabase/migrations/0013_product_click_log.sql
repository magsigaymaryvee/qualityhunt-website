-- Per-click log, powering the admin's outbound-clicks graph and its date
-- range / board filters. products.click_count stays as the fast all-time
-- running total shown elsewhere; this table is what makes a time-series
-- view possible at all.
create table if not exists product_clicks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists product_clicks_product_id_created_at_idx
  on product_clicks (product_id, created_at desc);
