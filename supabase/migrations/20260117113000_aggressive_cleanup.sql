-- Aggressive cleanup policy: Delete matches and tournaments 1 hour after completion.

CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Cleanup old tournaments
  -- Completed tournaments: delete after 1 hour
  DELETE FROM public.tournaments 
  WHERE status = 'completed' AND completed_at < (now() - interval '1 hour');

  -- Unstarted (open/scheduled) tournaments: delete after 48 hours (housekeeping)
  DELETE FROM public.tournaments 
  WHERE (status = 'open' OR status = 'scheduled') AND created_at < (now() - interval '48 hours');

  -- 2. Cleanup matches
  -- Delete ALL completed matches older than 1 hour.
  -- (EXCEPT those still referenced by a tournament structure - e.g. if tournament is still valid/active)
  -- Note: If the tournament was deleted in step 1, its tournament_matches are gone, so those matches will be deleted here.
  DELETE FROM public.matches
  WHERE status = 'completed' 
  AND completed_at < (now() - interval '1 hour')
  AND id NOT IN (SELECT match_id FROM public.tournament_matches WHERE match_id IS NOT NULL);

  -- 3. Cleanup old invites (housekeeping)
  DELETE FROM public.friend_requests WHERE created_at < (now() - interval '1 month') OR status != 'pending';
  DELETE FROM public.league_invites WHERE created_at < (now() - interval '1 month') OR status != 'pending';
  DELETE FROM public.tournament_invites WHERE created_at < (now() - interval '1 month') OR status != 'pending';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute immediate cleanup of existing data based on new rules
DELETE FROM public.tournaments 
WHERE status = 'completed' AND completed_at < (now() - interval '1 hour');

DELETE FROM public.matches
WHERE status = 'completed' 
AND completed_at < (now() - interval '1 hour')
AND id NOT IN (SELECT match_id FROM public.tournament_matches WHERE match_id IS NOT NULL);
