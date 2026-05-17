CREATE TABLE IF NOT EXISTS media_items (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type            text NOT NULL CHECK (type IN ('movie', 'tvshow', 'game')),
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
ALTER TABLE media_items ADD CONSTRAINT media_items_type_check CHECK (type IN ('movie', 'tvshow', 'game'));

ALTER TABLE media_items ADD COLUMN IF NOT EXISTS ratings_json jsonb;

ALTER TABLE media_items ADD COLUMN IF NOT EXISTS community_rating float;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS community_rating_source text;

-- ── Shared Capsules Co-op ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shared_capsules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  poster_url     text,
  rawg_id        text,
  dominant_color text,
  shared_notes   text NOT NULL DEFAULT '',
  created_by     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared_capsule_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id      uuid NOT NULL REFERENCES shared_capsules(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'inProgress'
                  CHECK (status IN ('completed', 'inProgress', 'dropped', 'abandoned')),
  personal_rating int CHECK (personal_rating BETWEEN 1 AND 5),
  personal_notes  text NOT NULL DEFAULT '',
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (capsule_id, user_id)
);

CREATE TABLE IF NOT EXISTS shared_capsule_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id  uuid NOT NULL REFERENCES shared_capsules(id) ON DELETE CASCADE,
  inviter_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (capsule_id, invitee_id)
);

ALTER TABLE shared_capsules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_capsule_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_capsule_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_member_select" ON shared_capsules FOR SELECT
  USING (EXISTS (SELECT 1 FROM shared_capsule_members WHERE capsule_id = shared_capsules.id AND user_id = auth.uid()));
CREATE POLICY "sc_member_update" ON shared_capsules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM shared_capsule_members WHERE capsule_id = shared_capsules.id AND user_id = auth.uid()));
CREATE POLICY "sc_creator_insert" ON shared_capsules FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "scm_member_select" ON shared_capsule_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM shared_capsule_members m2 WHERE m2.capsule_id = shared_capsule_members.capsule_id AND m2.user_id = auth.uid()));
CREATE POLICY "scm_own_update" ON shared_capsule_members FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "scm_own_insert" ON shared_capsule_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sci_parties_select" ON shared_capsule_invitations FOR SELECT
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());
CREATE POLICY "sci_inviter_insert" ON shared_capsule_invitations FOR INSERT
  WITH CHECK (inviter_id = auth.uid());
CREATE POLICY "sci_invitee_update" ON shared_capsule_invitations FOR UPDATE
  USING (invitee_id = auth.uid());
