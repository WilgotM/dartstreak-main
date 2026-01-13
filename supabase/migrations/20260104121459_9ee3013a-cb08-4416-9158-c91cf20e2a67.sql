-- Create matches table
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  starting_score integer NOT NULL DEFAULT 501 CHECK (starting_score IN (301, 501, 701)),
  checkout_type text NOT NULL DEFAULT 'double_out' CHECK (checkout_type IN ('straight_out', 'double_out')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  winner_id uuid REFERENCES public.profiles(id),
  player1_score integer NOT NULL,
  player2_score integer,
  current_turn uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  signaling_data jsonb DEFAULT '{}'::jsonb
);

-- Create match throws table
CREATE TABLE public.match_throws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  throw_number integer NOT NULL,
  dart_1 integer NOT NULL DEFAULT 0,
  dart_2 integer NOT NULL DEFAULT 0,
  dart_3 integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  remaining_score integer NOT NULL,
  is_bust boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_throws ENABLE ROW LEVEL SECURITY;

-- Matches policies
CREATE POLICY "Players can view their matches"
ON public.matches FOR SELECT
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Users can create matches"
ON public.matches FOR INSERT
WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Players can update their matches"
ON public.matches FOR UPDATE
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Match throws policies
CREATE POLICY "Players can view match throws"
ON public.match_throws FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.matches 
    WHERE matches.id = match_throws.match_id 
    AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
  )
);

CREATE POLICY "Players can insert their throws"
ON public.match_throws FOR INSERT
WITH CHECK (auth.uid() = player_id);

-- Enable realtime for matches
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_throws;