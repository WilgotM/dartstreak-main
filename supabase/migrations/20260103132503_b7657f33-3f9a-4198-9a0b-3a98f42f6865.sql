-- Add round_start_day to leagues (1=Monday, 2=Tuesday, etc.)
ALTER TABLE public.leagues
ADD COLUMN round_start_day integer NOT NULL DEFAULT 1
CHECK (round_start_day >= 1 AND round_start_day <= 7);

-- Allow league creators to delete their leagues
CREATE POLICY "League creators can delete their leagues"
ON public.leagues
FOR DELETE
USING (auth.uid() = created_by);

-- Also delete related league_members when league is deleted
ALTER TABLE public.league_members
DROP CONSTRAINT IF EXISTS league_members_league_id_fkey;

ALTER TABLE public.league_members
ADD CONSTRAINT league_members_league_id_fkey
FOREIGN KEY (league_id)
REFERENCES public.leagues(id)
ON DELETE CASCADE;

-- Also delete related daily_throws when league is deleted
ALTER TABLE public.daily_throws
DROP CONSTRAINT IF EXISTS daily_throws_league_id_fkey;

ALTER TABLE public.daily_throws
ADD CONSTRAINT daily_throws_league_id_fkey
FOREIGN KEY (league_id)
REFERENCES public.leagues(id)
ON DELETE CASCADE;