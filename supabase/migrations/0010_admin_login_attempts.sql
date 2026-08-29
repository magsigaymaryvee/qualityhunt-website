-- Backs the admin login's per-IP rate limit. A plain in-memory counter
-- wouldn't work reliably on Vercel — each serverless invocation can land on
-- a different instance with its own memory — so this tracks attempts in the
-- database instead, the same pattern already used for the public chat
-- endpoint's rate limit.
create table if not exists admin_login_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_login_attempts_ip_created_at_idx
  on admin_login_attempts (ip, created_at desc);
