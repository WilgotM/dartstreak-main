-- Country requirement + system leagues (global + country)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS country_timezone TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_country_pair_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_country_pair_check
  CHECK (
    (country_code IS NULL AND country_timezone IS NULL)
    OR (country_code IS NOT NULL AND country_timezone IS NOT NULL)
  );

ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS system_scope TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS league_timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS season_key TEXT;

ALTER TABLE public.leagues
  DROP CONSTRAINT IF EXISTS leagues_system_scope_check;
ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_system_scope_check
  CHECK (
    (NOT is_system AND system_scope IS NULL)
    OR (is_system AND system_scope IN ('global', 'country'))
  );

ALTER TABLE public.leagues
  DROP CONSTRAINT IF EXISTS leagues_system_country_check;
ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_system_country_check
  CHECK (
    (system_scope = 'country' AND country_code IS NOT NULL)
    OR (system_scope = 'global' AND country_code IS NULL)
    OR (system_scope IS NULL)
  );

ALTER TABLE public.leagues
  DROP CONSTRAINT IF EXISTS leagues_system_season_check;
ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_system_season_check
  CHECK (
    (NOT is_system)
    OR (is_system AND season_key IS NOT NULL AND started_at IS NOT NULL AND camera_required = true AND total_rounds = 1)
  );

ALTER TABLE public.leagues
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.leagues
  DROP CONSTRAINT IF EXISTS leagues_created_by_fkey;

ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS leagues_system_global_unique_idx
ON public.leagues (system_scope, season_key)
WHERE is_system = true AND system_scope = 'global';

CREATE UNIQUE INDEX IF NOT EXISTS leagues_system_country_unique_idx
ON public.leagues (system_scope, country_code, season_key)
WHERE is_system = true AND system_scope = 'country';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, country_code, country_timezone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    NULLIF(upper(new.raw_user_meta_data ->> 'country_code'), ''),
    NULLIF(new.raw_user_meta_data ->> 'country_timezone', '')
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_system_memberships(
  p_user_id UUID,
  p_previous_country_code TEXT DEFAULT NULL,
  p_previous_country_timezone TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country_code TEXT;
  v_country_timezone TEXT;

  v_global_week_start DATE;
  v_global_start TIMESTAMPTZ;
  v_global_season_key TEXT;

  v_country_week_start DATE;
  v_country_start TIMESTAMPTZ;
  v_country_season_key TEXT;

  v_previous_country_season_key TEXT;

  v_global_league_id UUID;
  v_country_league_id UUID;
BEGIN
  SELECT country_code, country_timezone
  INTO v_country_code, v_country_timezone
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_country_code IS NULL OR v_country_timezone IS NULL THEN
    RETURN;
  END IF;

  v_global_week_start := date_trunc('week', now() AT TIME ZONE 'UTC')::date;
  v_global_start := (v_global_week_start::timestamp AT TIME ZONE 'UTC');
  v_global_season_key := to_char(v_global_week_start, 'IYYY-"W"IW');

  v_country_week_start := date_trunc('week', now() AT TIME ZONE v_country_timezone)::date;
  v_country_start := (v_country_week_start::timestamp AT TIME ZONE v_country_timezone);
  v_country_season_key := to_char(v_country_week_start, 'IYYY-"W"IW');

  INSERT INTO public.leagues (
    name,
    total_rounds,
    current_round,
    round_start_day,
    started_at,
    created_by,
    camera_required,
    is_system,
    system_scope,
    country_code,
    league_timezone,
    season_key
  )
  VALUES (
    'Global League ' || v_global_season_key,
    1,
    1,
    1,
    v_global_start,
    NULL,
    true,
    true,
    'global',
    NULL,
    'UTC',
    v_global_season_key
  )
  ON CONFLICT (system_scope, season_key)
    WHERE is_system = true AND system_scope = 'global'
  DO UPDATE SET
    league_timezone = EXCLUDED.league_timezone,
    camera_required = true,
    total_rounds = 1
  RETURNING id INTO v_global_league_id;

  INSERT INTO public.leagues (
    name,
    total_rounds,
    current_round,
    round_start_day,
    started_at,
    created_by,
    camera_required,
    is_system,
    system_scope,
    country_code,
    league_timezone,
    season_key
  )
  VALUES (
    'Country League ' || v_country_code || ' ' || v_country_season_key,
    1,
    1,
    1,
    v_country_start,
    NULL,
    true,
    true,
    'country',
    v_country_code,
    v_country_timezone,
    v_country_season_key
  )
  ON CONFLICT (system_scope, country_code, season_key)
    WHERE is_system = true AND system_scope = 'country'
  DO UPDATE SET
    league_timezone = EXCLUDED.league_timezone,
    camera_required = true,
    total_rounds = 1
  RETURNING id INTO v_country_league_id;

  INSERT INTO public.league_members (league_id, user_id)
  VALUES (v_global_league_id, p_user_id)
  ON CONFLICT (league_id, user_id) DO NOTHING;

  INSERT INTO public.league_members (league_id, user_id)
  VALUES (v_country_league_id, p_user_id)
  ON CONFLICT (league_id, user_id) DO NOTHING;

  IF p_previous_country_code IS NOT NULL
     AND p_previous_country_timezone IS NOT NULL
     AND p_previous_country_code <> v_country_code THEN
    v_previous_country_season_key := to_char(
      date_trunc('week', now() AT TIME ZONE p_previous_country_timezone)::date,
      'IYYY-"W"IW'
    );

    DELETE FROM public.league_members lm
    USING public.leagues l
    WHERE lm.league_id = l.id
      AND lm.user_id = p_user_id
      AND l.is_system = true
      AND l.system_scope = 'country'
      AND l.country_code = p_previous_country_code
      AND l.season_key = v_previous_country_season_key
      AND now() < (l.started_at + interval '7 days');
  END IF;

  UPDATE public.daily_throws dt
  SET video_url = NULL
  FROM public.leagues l
  WHERE dt.league_id = l.id
    AND l.is_system = true
    AND l.started_at IS NOT NULL
    AND now() >= (l.started_at + interval '7 days')
    AND dt.video_url IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_profile_country_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.country_code IS NULL OR NEW.country_timezone IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.ensure_system_memberships(NEW.id, NULL, NULL);
    RETURN NEW;
  END IF;

  IF (OLD.country_code IS DISTINCT FROM NEW.country_code)
     OR (OLD.country_timezone IS DISTINCT FROM NEW.country_timezone) THEN
    PERFORM public.ensure_system_memberships(NEW.id, OLD.country_code, OLD.country_timezone);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_country_change ON public.profiles;
CREATE TRIGGER on_profile_country_change
AFTER INSERT OR UPDATE OF country_code, country_timezone
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_country_change();

DROP POLICY IF EXISTS "League creators can update their leagues" ON public.leagues;
CREATE POLICY "League creators can update their leagues"
ON public.leagues FOR UPDATE
USING (auth.uid() = created_by AND is_system = false)
WITH CHECK (auth.uid() = created_by AND is_system = false);

DROP POLICY IF EXISTS "League creators can delete their leagues" ON public.leagues;
CREATE POLICY "League creators can delete their leagues"
ON public.leagues FOR DELETE
USING (auth.uid() = created_by AND is_system = false);

DROP POLICY IF EXISTS "Authenticated users can join leagues" ON public.league_members;
CREATE POLICY "Authenticated users can join leagues"
ON public.league_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.leagues l
    WHERE l.id = league_members.league_id
      AND l.is_system = true
  )
);

DROP POLICY IF EXISTS "Users can leave leagues" ON public.league_members;
CREATE POLICY "Users can leave leagues"
ON public.league_members FOR DELETE
USING (
  auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.leagues l
    WHERE l.id = league_members.league_id
      AND l.is_system = true
  )
);

DO $$
DECLARE
  v_profile RECORD;
BEGIN
  FOR v_profile IN
    SELECT id
    FROM public.profiles
    WHERE country_code IS NOT NULL
      AND country_timezone IS NOT NULL
  LOOP
    PERFORM public.ensure_system_memberships(v_profile.id, NULL, NULL);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_system_memberships(UUID, TEXT, TEXT) TO authenticated;
