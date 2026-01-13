-- Drop problematic policies
DROP POLICY IF EXISTS "Members can view other members in their leagues" ON public.league_members;
DROP POLICY IF EXISTS "Users can view leagues they are members of" ON public.leagues;
DROP POLICY IF EXISTS "Members can view throws in their leagues" ON public.daily_throws;
DROP POLICY IF EXISTS "Users can insert their own throws" ON public.daily_throws;

-- Create security definer function to check league membership
CREATE OR REPLACE FUNCTION public.is_league_member(_league_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members
    WHERE league_id = _league_id
    AND user_id = _user_id
  )
$$;

-- Create security definer function to check if user is league creator
CREATE OR REPLACE FUNCTION public.is_league_creator(_league_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leagues
    WHERE id = _league_id
    AND created_by = _user_id
  )
$$;

-- Recreate policies using the functions
CREATE POLICY "Members can view other members in their leagues"
ON public.league_members FOR SELECT
USING (public.is_league_member(league_id, auth.uid()));

CREATE POLICY "Users can view leagues they are members of"
ON public.leagues FOR SELECT
USING (public.is_league_member(id, auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Members can view throws in their leagues"
ON public.daily_throws FOR SELECT
USING (public.is_league_member(league_id, auth.uid()));

CREATE POLICY "Users can insert their own throws"
ON public.daily_throws FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.is_league_member(league_id, auth.uid())
);