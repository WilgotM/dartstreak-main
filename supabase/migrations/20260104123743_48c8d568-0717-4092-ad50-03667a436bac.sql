-- More robust WebRTC signaling (avoid jsonb overwrite races)

CREATE TABLE IF NOT EXISTS public.match_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_signals_type_check CHECK (signal_type IN ('offer', 'answer', 'candidate'))
);

CREATE INDEX IF NOT EXISTS match_signals_match_id_created_at_idx
  ON public.match_signals(match_id, created_at);

ALTER TABLE public.match_signals ENABLE ROW LEVEL SECURITY;

-- Participants can view signals for matches they are part of
CREATE POLICY "Match participants can view signals"
ON public.match_signals
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = match_signals.match_id
      AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
  )
);

-- Participants can send signals only as themselves, to the opponent in that match
CREATE POLICY "Match participants can send signals"
ON public.match_signals
FOR INSERT
WITH CHECK (
  from_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = match_signals.match_id
      AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
      AND (m.player1_id = to_user_id OR m.player2_id = to_user_id)
      AND to_user_id <> auth.uid()
  )
);
