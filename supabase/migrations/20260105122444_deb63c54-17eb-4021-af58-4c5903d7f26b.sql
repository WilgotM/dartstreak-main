
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Anyone can view public tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Participants can view their tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Anyone can view participants of public tournaments" ON public.tournament_participants;
DROP POLICY IF EXISTS "Users can join public tournaments" ON public.tournament_participants;
DROP POLICY IF EXISTS "Tournament creators can manage participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Anyone can view matches of public tournaments" ON public.tournament_matches;
DROP POLICY IF EXISTS "Tournament creators can manage matches" ON public.tournament_matches;

-- Create security definer function to check if user is tournament creator
CREATE OR REPLACE FUNCTION public.is_tournament_creator(_tournament_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = _tournament_id AND created_by = _user_id
  )
$$;

-- Create security definer function to check if user is tournament participant
CREATE OR REPLACE FUNCTION public.is_tournament_participant(_tournament_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tournament_participants
    WHERE tournament_id = _tournament_id AND user_id = _user_id
  )
$$;

-- Create security definer function to check if tournament is public
CREATE OR REPLACE FUNCTION public.is_tournament_public(_tournament_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = _tournament_id AND is_public = true
  )
$$;

-- Create security definer function to check if tournament is open and public
CREATE OR REPLACE FUNCTION public.is_tournament_open_and_public(_tournament_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = _tournament_id AND is_public = true AND status = 'open'
  )
$$;

-- Recreate tournaments policies using functions
CREATE POLICY "Anyone can view public tournaments" ON public.tournaments
  FOR SELECT USING (is_public = true);

CREATE POLICY "Creators can view their tournaments" ON public.tournaments
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Participants can view their tournaments" ON public.tournaments
  FOR SELECT USING (
    public.is_tournament_participant(id, auth.uid())
  );

-- Recreate tournament_participants policies using functions
CREATE POLICY "View participants of public tournaments" ON public.tournament_participants
  FOR SELECT USING (
    public.is_tournament_public(tournament_id)
  );

CREATE POLICY "View own participation" ON public.tournament_participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Creators can view their tournament participants" ON public.tournament_participants
  FOR SELECT USING (
    public.is_tournament_creator(tournament_id, auth.uid())
  );

CREATE POLICY "Users can join open public tournaments" ON public.tournament_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    public.is_tournament_open_and_public(tournament_id)
  );

CREATE POLICY "Creators can insert participants" ON public.tournament_participants
  FOR INSERT WITH CHECK (
    public.is_tournament_creator(tournament_id, auth.uid())
  );

CREATE POLICY "Creators can update participants" ON public.tournament_participants
  FOR UPDATE USING (
    public.is_tournament_creator(tournament_id, auth.uid())
  );

CREATE POLICY "Creators can delete participants" ON public.tournament_participants
  FOR DELETE USING (
    public.is_tournament_creator(tournament_id, auth.uid())
  );

-- Recreate tournament_matches policies using functions
CREATE POLICY "View matches of public tournaments" ON public.tournament_matches
  FOR SELECT USING (
    public.is_tournament_public(tournament_id)
  );

CREATE POLICY "Participants can view their tournament matches" ON public.tournament_matches
  FOR SELECT USING (
    public.is_tournament_participant(tournament_id, auth.uid())
  );

CREATE POLICY "Creators can view their tournament matches" ON public.tournament_matches
  FOR SELECT USING (
    public.is_tournament_creator(tournament_id, auth.uid())
  );

CREATE POLICY "Creators can insert matches" ON public.tournament_matches
  FOR INSERT WITH CHECK (
    public.is_tournament_creator(tournament_id, auth.uid())
  );

CREATE POLICY "Creators can update matches" ON public.tournament_matches
  FOR UPDATE USING (
    public.is_tournament_creator(tournament_id, auth.uid())
  );

CREATE POLICY "Creators can delete matches" ON public.tournament_matches
  FOR DELETE USING (
    public.is_tournament_creator(tournament_id, auth.uid())
  );
