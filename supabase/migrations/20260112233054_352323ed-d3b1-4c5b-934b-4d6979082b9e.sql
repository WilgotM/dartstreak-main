-- Add scheduled start time and round tracking for tournament automation
ALTER TABLE public.tournaments
ADD COLUMN scheduled_start_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN round_started_at TIMESTAMP WITH TIME ZONE;

-- Add scheduled_start_at to tournament_matches for per-match timing
ALTER TABLE public.tournament_matches
ADD COLUMN scheduled_start_at TIMESTAMP WITH TIME ZONE;

-- Allow participants to update tournament matches (for completing matches)
CREATE POLICY "Participants can update their matches" ON public.tournament_matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tournament_participants tp
      WHERE tp.tournament_id = tournament_id AND tp.user_id = auth.uid()
    )
  );
