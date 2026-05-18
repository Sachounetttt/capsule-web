-- Table de cache pour TMDB / RAWG
CREATE TABLE IF NOT EXISTS media_cache (
  external_id   text    NOT NULL,
  media_type    text    NOT NULL CHECK (media_type IN ('movie', 'tvshow', 'game')),
  data          jsonb   NOT NULL,
  cached_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (external_id, media_type)
);

-- Index pour pruning rapide du cache par date
CREATE INDEX IF NOT EXISTS media_cache_cached_at_idx ON media_cache (cached_at);

-- Colonne runtime (minutes pour films/séries, minutes estimées pour jeux)
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS runtime_minutes int;
-- Colonne external_id (tmdb_id ou rawg_id, stocké comme texte)
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS external_id text;
