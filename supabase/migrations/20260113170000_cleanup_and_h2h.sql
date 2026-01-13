
-- Create head_to_head table to persist stats even after matches are deleted
CREATE TABLE IF NOT EXISTS public.head_to_head (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player1_wins INTEGER NOT NULL DEFAULT 0,
  player2_wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  last_match_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(player1_id, player2_id),
  CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- Enable RLS on head_to_head
ALTER TABLE public.head_to_head ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own head_to_head records"
ON public.head_to_head FOR SELECT
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Function to update head_to_head stats
CREATE OR REPLACE FUNCTION public.update_head_to_head()
RETURNS TRIGGER AS $$
DECLARE
  p1_id UUID;
  p2_id UUID;
  winner_id UUID;
  h2h_id UUID;
BEGIN
  -- Only proceed if match is completed and has two players
  IF NEW.status = 'completed' AND NEW.player2_id IS NOT NULL THEN
    -- Ensure player1_id is always the smaller UUID to maintain uniqueness in H2H table
    IF NEW.player1_id < NEW.player2_id THEN
      p1_id := NEW.player1_id;
      p2_id := NEW.player2_id;
      winner_id := NEW.winner_id;
    ELSE
      p1_id := NEW.player2_id;
      p2_id := NEW.player1_id;
      winner_id := NEW.winner_id;
    END IF;

    -- Get or create H2H record
    INSERT INTO public.head_to_head (player1_id, player2_id)
    VALUES (p1_id, p2_id)
    ON CONFLICT (player1_id, player2_id) DO NOTHING
    RETURNING id INTO h2h_id;

    IF h2h_id IS NULL THEN
      SELECT id INTO h2h_id FROM public.head_to_head 
      WHERE player1_id = p1_id AND player2_id = p2_id;
    END IF;

    -- Update stats
    IF winner_id IS NULL THEN
      UPDATE public.head_to_head 
      SET draws = draws + 1, last_match_at = now()
      WHERE id = h2h_id;
    ELSIF winner_id = p1_id THEN
      UPDATE public.head_to_head 
      SET player1_wins = player1_wins + 1, last_match_at = now()
      WHERE id = h2h_id;
    ELSE
      UPDATE public.head_to_head 
      SET player2_wins = player2_wins + 1, last_match_at = now()
      WHERE id = h2h_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Delete matches older than 1 month
  DELETE FROM public.matches
  WHERE created_at < (now() - interval '1 month');

  -- 2. Keep only the 10 latest matches for each user involved in the new match
  -- Cleanup for player 1
  DELETE FROM public.matches
  WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id)
  AND id NOT IN (
    SELECT id FROM public.matches 
    WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id)
    ORDER BY created_at DESC 
    LIMIT 10
  );

  -- Cleanup for player 2 (if it exists and is not a bot/guest)
  IF NEW.player2_id IS NOT NULL THEN
    DELETE FROM public.matches
    WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id)
    AND id NOT IN (
      SELECT id FROM public.matches 
      WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id)
      ORDER BY created_at DESC 
      LIMIT 10
    );
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

-- Trigger for updating head_to_head and cleaning up data
CREATE TRIGGER on_match_completed
  AFTER UPDATE OF status ON public.matches
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.update_head_to_head();

-- We can also run cleanup when a match is created or completed
CREATE TRIGGER on_match_cleanup
  AFTER INSERT OR UPDATE OF status ON public.matches
  FOR EACH ROW
  WHEN (NEW.status = 'completed' OR TG_OP = 'INSERT')
  EXECUTE FUNCTION public.cleanup_old_data();
