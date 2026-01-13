
-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  max_players INTEGER NOT NULL DEFAULT 8,
  starting_score INTEGER NOT NULL DEFAULT 501,
  checkout_type TEXT NOT NULL DEFAULT 'double_out',
  legs_to_win INTEGER NOT NULL DEFAULT 1,
  sets_to_win INTEGER NOT NULL DEFAULT 1,
  bot_average INTEGER DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'open',
  current_round INTEGER NOT NULL DEFAULT 1,
  winner_id UUID,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tournament participants table
CREATE TABLE public.tournament_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  bot_name TEXT,
  seed INTEGER,
  eliminated_at_round INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tournament matches table (for bracket)
CREATE TABLE public.tournament_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_participant_id UUID REFERENCES public.tournament_participants(id),
  player2_participant_id UUID REFERENCES public.tournament_participants(id),
  winner_participant_id UUID REFERENCES public.tournament_participants(id),
  match_id UUID REFERENCES public.matches(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tournament invites table
CREATE TABLE public.tournament_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_invites ENABLE ROW LEVEL SECURITY;

-- Tournaments policies
CREATE POLICY "Anyone can view public tournaments" ON public.tournaments
  FOR SELECT USING (is_public = true);

CREATE POLICY "Participants can view their tournaments" ON public.tournaments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournament_participants tp
      WHERE tp.tournament_id = id AND tp.user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create tournaments" ON public.tournaments
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their tournaments" ON public.tournaments
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their tournaments" ON public.tournaments
  FOR DELETE USING (auth.uid() = created_by);

-- Tournament participants policies
CREATE POLICY "Anyone can view participants of public tournaments" ON public.tournament_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND (t.is_public = true OR t.created_by = auth.uid())
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can join public tournaments" ON public.tournament_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.is_public = true AND t.status = 'open'
    )
  );

CREATE POLICY "Tournament creators can manage participants" ON public.tournament_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );

-- Tournament matches policies
CREATE POLICY "Anyone can view matches of public tournaments" ON public.tournament_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND (t.is_public = true OR t.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.tournament_participants tp
      WHERE tp.tournament_id = tournament_id AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Tournament creators can manage matches" ON public.tournament_matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );

-- Tournament invites policies
CREATE POLICY "Users can view their tournament invites" ON public.tournament_invites
  FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Tournament creators can send invites" ON public.tournament_invites
  FOR INSERT WITH CHECK (
    from_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "Recipients can update invites" ON public.tournament_invites
  FOR UPDATE USING (to_user_id = auth.uid());

CREATE POLICY "Users can delete their invites" ON public.tournament_invites
  FOR DELETE USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Enable realtime for tournaments
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;
