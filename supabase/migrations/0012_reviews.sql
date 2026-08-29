-- Visitor-submitted product reviews. Not shown publicly until an admin
-- approves them (approved defaults to false) — protects the site from spam
-- or abuse landing straight in front of visitors.
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null default '',
  rating smallint not null check (rating between 1 and 5),
  body text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists reviews_product_id_idx on reviews (product_id);
create index if not exists reviews_approved_idx on reviews (approved);

-- Backs the review submission form's per-IP rate limit — same pattern as
-- admin_login_attempts, since an in-memory counter wouldn't survive across
-- Vercel's serverless invocations.
create table if not exists review_submission_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists review_submission_attempts_ip_created_at_idx
  on review_submission_attempts (ip, created_at desc);
