-- Splits each carousel item's text into a short title (shown under the
-- thumbnail) and the longer caption (shown only when a viewer clicks
-- through to see more — same idea as a Pinterest pin's title vs. its
-- description).
alter table product_media add column if not exists title text not null default '';
