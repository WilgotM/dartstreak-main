-- Fix cleanup_old_data function to avoid deleting tournament matches
-- that are referenced by tournament_matches table (FOREIGN KEY constraint violation)

CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Delete matches older than 1 month (EXCLUDING tournament matches)
  DELETE FROM public.matches
  WHERE created_at < (now() - interval '1 month')
  AND id NOT IN (SELECT match_id FROM public.tournament_matches WHERE match_id IS NOT NULL);

  -- 2. Keep only the 10 latest matches for each user involved in the new match
  -- Cleanup for player 1
  DELETE FROM public.matches
  WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id)
  AND id NOT IN (
    SELECT id FROM public.matches 
    WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id)
    ORDER BY created_at DESC 
    LIMIT 10
  )
  AND id NOT IN (SELECT match_id FROM public.tournament_matches WHERE match_id IS NOT NULL);

  -- Cleanup for player 2 (if it exists and is not a bot/guest)
  IF NEW.player2_id IS NOT NULL THEN
    DELETE FROM public.matches
    WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id)
    AND id NOT IN (
      SELECT id FROM public.matches 
      WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id)
      ORDER BY created_at DESC 
      LIMIT 10
    )
    AND id NOT IN (SELECT match_id FROM public.tournament_matches WHERE match_id IS NOT NULL);
  END IF;

  -- 3. Cleanup old invites (older than 1 month)
  DELETE FROM public.friend_requests WHERE created_at < (now() - interval '1 month') OR status != 'pending';
  DELETE FROM public.league_invites WHERE created_at < (now() - interval '1 month') OR status != 'pending';
  DELETE FROM public.tournament_invites WHERE created_at < (now() - interval '1 month') OR status != 'pending';

  -- 4. Cleanup old tournaments
  -- Completed tournaments: delete after 1 hour
  DELETE FROM public.tournaments 
  WHERE status = 'completed' AND completed_at < (now() - interval '1 hour');

  -- Unstarted (open/scheduled) tournaments: delete after 48 hours
  DELETE FROM public.tournaments 
  WHERE (status = 'open' OR status = 'scheduled') AND created_at < (now() - interval '48 hours');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
