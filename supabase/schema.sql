CREATE TABLE IF NOT EXISTS media_items (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type            text NOT NULL CHECK (type IN ('movie', 'tvshow', 'book', 'game')),
  title           text NOT NULL,
  year            int,
  status          text NOT NULL DEFAULT 'inProgress'
                  CHECK (status IN ('completed', 'inProgress', 'dropped', 'abandoned')),
  rating          int CHECK (rating BETWEEN 1 AND 5),
  notes           text NOT NULL DEFAULT '',
  date_added      timestamptz NOT NULL DEFAULT now(),
  date_completed  timestamptz,
  poster_url      text,
  dominant_color  text,
  genre           text,
  director        text,
  seasons_watched int,
  total_seasons   int,
  author          text,
  pages           int,
  isbn            text
);

CREATE TABLE IF NOT EXISTS config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE media_items ADD COLUMN IF NOT EXISTS wishlist boolean DEFAULT false;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS developer text;

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_type_check;
ALTER TABLE media_items ADD CONSTRAINT media_items_type_check CHECK (type IN ('movie', 'tvshow', 'book', 'game'));

ALTER TABLE media_items ADD COLUMN IF NOT EXISTS ratings_json jsonb;

ALTER TABLE media_items ADD COLUMN IF NOT EXISTS community_rating float;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS community_rating_source text;
