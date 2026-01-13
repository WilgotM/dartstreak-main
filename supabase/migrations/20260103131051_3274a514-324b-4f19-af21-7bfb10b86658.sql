-- Fix relationships so we can join profiles from league_members/daily_throws/leagues
-- This enables PostgREST embedding like: league_members?select=user_id,profiles(display_name)

ALTER TABLE public.league_members
  DROP CONSTRAINT IF EXISTS league_members_user_id_fkey;

ALTER TABLE public.league_members
  ADD CONSTRAINT league_members_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

ALTER TABLE public.daily_throws
  DROP CONSTRAINT IF EXISTS daily_throws_user_id_fkey;

ALTER TABLE public.daily_throws
  ADD CONSTRAINT daily_throws_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

ALTER TABLE public.leagues
  DROP CONSTRAINT IF EXISTS leagues_created_by_fkey;

ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;