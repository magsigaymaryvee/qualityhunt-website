-- Lets an admin hold a product back as a draft or schedule it to go live
-- at a future date/time, the same way boards already have a Published
-- toggle. One nullable timestamp covers all three states:
--   NULL             -> draft, never shown on the public site
--   a future time    -> scheduled, hidden until that time passes
--   now or a past time -> live right now
alter table products add column if not exists publish_at timestamptz;

-- Backfill: every product that already exists is already live on the
-- public site today, so keep it that way rather than suddenly hiding
-- everything the moment this migration runs.
update products set publish_at = now() where publish_at is null;
