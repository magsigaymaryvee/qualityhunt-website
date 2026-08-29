-- Boards (Pinterest-style collections, e.g. "Cropped Jacket Style Guide")
-- and products (the shoppable items pinned inside a board).
--
-- Run this in the Supabase SQL editor for your project (SQL Editor -> New
-- query -> paste -> Run). RLS is enabled with zero policies on purpose: the
-- app never talks to Supabase from the browser — every read and write goes
-- through server code using the service role key, which bypasses RLS
-- entirely — so "enabled, no policies" just means nothing else (an exposed
-- anon key, a stray client-side call) can read or write these tables.

create extension if not exists pgcrypto;

create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  kicker text not null default '',
  title text not null,
  intro text not null default '',
  cover_image_url text,
  published boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  slug text unique not null,
  tagline text not null default '',
  name text not null,
  description text not null default '',
  price_label text not null default '',
  image_url text,
  buy_url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_board_id_idx on products(board_id);
create index if not exists boards_published_position_idx on boards(published, position);
create index if not exists products_board_position_idx on products(board_id, position);

alter table boards enable row level security;
alter table products enable row level security;
