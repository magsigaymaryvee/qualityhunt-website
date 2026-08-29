-- Tracks how many times a product's outbound "Shop this" link has been
-- clicked, so the admin can see engagement instead of just publishing into
-- the void.
alter table products add column if not exists click_count integer not null default 0;

-- Atomic increment via RPC — a plain UPDATE ... SET click_count =
-- click_count + 1 isn't expressible through postgrest-js's update() (it only
-- sends column literals, not SQL expressions), and a read-then-write from
-- the API route would lose clicks under concurrent hits.
create or replace function increment_product_click(p_product_id uuid)
returns void
language sql
as $$
  update products set click_count = click_count + 1 where id = p_product_id;
$$;
