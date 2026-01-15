-- Fix: Allow users to join scheduled tournaments (not just open ones)
-- The is_tournament_open_and_public function was only checking for status = 'open'
-- but scheduled tournaments also need to allow joins before they start

CREATE OR REPLACE FUNCTION public.is_tournament_open_and_public(_tournament_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = _tournament_id 
      AND is_public = true 
      AND status IN ('open', 'scheduled')
  )
$$;
