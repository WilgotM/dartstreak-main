-- =====================================================
-- DARTSTREAK FULL SCHEMA RESTORE
-- Run this in Supabase SQL Editor to restore everything
-- =====================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  timezone TEXT DEFAULT 'Europe/Stockholm',
  display_name_changed_at TIMESTAMP WITH TIME ZONE,
  email_changed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_display_name_unique'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_name_unique UNIQUE (display_name);
  END IF;
END $$;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Handle new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. LEAGUES TABLE
CREATE TABLE IF NOT EXISTS public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 6),
  total_rounds INTEGER NOT NULL DEFAULT 4,
  current_round INTEGER NOT NULL DEFAULT 1,
  round_start_day INTEGER NOT NULL DEFAULT 1 CHECK (round_start_day >= 1 AND round_start_day <= 7),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

-- 3. LEAGUE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);

ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

-- 4. DAILY THROWS TABLE
CREATE TABLE IF NOT EXISTS public.daily_throws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  throw_date DATE NOT NULL DEFAULT CURRENT_DATE,
  throw_1 INTEGER NOT NULL CHECK (throw_1 >= 0 AND throw_1 <= 60),
  throw_2 INTEGER NOT NULL CHECK (throw_2 >= 0 AND throw_2 <= 60),
  throw_3 INTEGER NOT NULL CHECK (throw_3 >= 0 AND throw_3 <= 60),
  throw_4 INTEGER NOT NULL CHECK (throw_4 >= 0 AND throw_4 <= 60),
  throw_5 INTEGER NOT NULL CHECK (throw_5 >= 0 AND throw_5 <= 60),
  throw_6 INTEGER NOT NULL CHECK (throw_6 >= 0 AND throw_6 <= 60),
  throw_7 INTEGER NOT NULL CHECK (throw_7 >= 0 AND throw_7 <= 60),
  throw_8 INTEGER NOT NULL CHECK (throw_8 >= 0 AND throw_8 <= 60),
  throw_9 INTEGER NOT NULL CHECK (throw_9 >= 0 AND throw_9 <= 60),
  total_score INTEGER GENERATED ALWAYS AS (throw_1 + throw_2 + throw_3 + throw_4 + throw_5 + throw_6 + throw_7 + throw_8 + throw_9) STORED,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id, throw_date)
);

ALTER TABLE public.daily_throws ENABLE ROW LEVEL SECURITY;

-- 5. FRIENDSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id),
  CHECK (user_id != friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- 6. FRIEND REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id),
  CHECK (from_user_id != to_user_id)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- 7. LEAGUE INVITES TABLE
CREATE TABLE IF NOT EXISTS public.league_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (league_id, to_user_id)
);

ALTER TABLE public.league_invites ENABLE ROW LEVEL SECURITY;

-- 8. MATCHES TABLE
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  starting_score INTEGER NOT NULL DEFAULT 501 CHECK (starting_score IN (301, 501, 701)),
  checkout_type TEXT NOT NULL DEFAULT 'double_out' CHECK (checkout_type IN ('straight_out', 'double_out')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  winner_id UUID REFERENCES public.profiles(id),
  player1_score INTEGER NOT NULL,
  player2_score INTEGER,
  current_turn UUID,
  is_offline BOOLEAN NOT NULL DEFAULT false,
  legs_to_win INTEGER NOT NULL DEFAULT 1,
  sets_to_win INTEGER NOT NULL DEFAULT 1,
  player1_legs INTEGER NOT NULL DEFAULT 0,
  player2_legs INTEGER NOT NULL DEFAULT 0,
  player1_sets INTEGER NOT NULL DEFAULT 0,
  player2_sets INTEGER NOT NULL DEFAULT 0,
  signaling_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- 9. MATCH THROWS TABLE
CREATE TABLE IF NOT EXISTS public.match_throws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  throw_number INTEGER NOT NULL,
  dart_1 INTEGER NOT NULL DEFAULT 0,
  dart_2 INTEGER NOT NULL DEFAULT 0,
  dart_3 INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  remaining_score INTEGER NOT NULL,
  is_bust BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.match_throws ENABLE ROW LEVEL SECURITY;

-- 10. MATCH SIGNALS TABLE
CREATE TABLE IF NOT EXISTS public.match_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'candidate')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS match_signals_match_id_created_at_idx ON public.match_signals(match_id, created_at);
ALTER TABLE public.match_signals ENABLE ROW LEVEL SECURITY;

-- 11. HEAD TO HEAD TABLE
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

ALTER TABLE public.head_to_head ENABLE ROW LEVEL SECURITY;

-- 12. TOURNAMENTS TABLE
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  max_players INTEGER NOT NULL DEFAULT 8,
  starting_score INTEGER NOT NULL DEFAULT 501,
  checkout_type TEXT NOT NULL DEFAULT 'double_out',
  legs_to_win INTEGER NOT NULL DEFAULT 1,
  sets_to_win INTEGER NOT NULL DEFAULT 1,
  bot_average INTEGER DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'open',
  current_round INTEGER NOT NULL DEFAULT 1,
  winner_id UUID REFERENCES public.profiles(id),
  scheduled_start_at TIMESTAMP WITH TIME ZONE,
  round_started_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- 13. TOURNAMENT PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  bot_name TEXT,
  seed INTEGER,
  eliminated_at_round INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- 14. TOURNAMENT MATCHES TABLE
CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_participant_id UUID REFERENCES public.tournament_participants(id),
  player2_participant_id UUID REFERENCES public.tournament_participants(id),
  winner_participant_id UUID REFERENCES public.tournament_participants(id),
  match_id UUID REFERENCES public.matches(id),
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_start_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- 15. TOURNAMENT INVITES TABLE
CREATE TABLE IF NOT EXISTS public.tournament_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_invites ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_league_member(_league_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = _league_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_league_creator(_league_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leagues
    WHERE id = _league_id AND created_by = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.are_friends(_user_id UUID, _friend_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user_id = _user_id AND friend_id = _friend_id)
       OR (user_id = _friend_id AND friend_id = _user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_tournament_creator(_tournament_id UUID, _user_id UUID)
RETURNS BOOLEAN
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

CREATE OR REPLACE FUNCTION public.is_tournament_participant(_tournament_id UUID, _user_id UUID)
RETURNS BOOLEAN
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

CREATE OR REPLACE FUNCTION public.is_tournament_public(_tournament_id UUID)
RETURNS BOOLEAN
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

CREATE OR REPLACE FUNCTION public.is_tournament_open_and_public(_tournament_id UUID)
RETURNS BOOLEAN
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

-- =====================================================
-- RLS POLICIES - LEAGUES
-- =====================================================

DROP POLICY IF EXISTS "Users can view leagues they are members of" ON public.leagues;
DROP POLICY IF EXISTS "Authenticated users can create leagues" ON public.leagues;
DROP POLICY IF EXISTS "League creators can update their leagues" ON public.leagues;
DROP POLICY IF EXISTS "League creators can delete their leagues" ON public.leagues;

CREATE POLICY "Users can view leagues they are members of" ON public.leagues
  FOR SELECT USING (public.is_league_member(id, auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create leagues" ON public.leagues
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "League creators can update their leagues" ON public.leagues
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "League creators can delete their leagues" ON public.leagues
  FOR DELETE USING (auth.uid() = created_by);

-- =====================================================
-- RLS POLICIES - LEAGUE MEMBERS
-- =====================================================

DROP POLICY IF EXISTS "Members can view other members in their leagues" ON public.league_members;
DROP POLICY IF EXISTS "Authenticated users can join leagues" ON public.league_members;
DROP POLICY IF EXISTS "Users can leave leagues" ON public.league_members;

CREATE POLICY "Members can view other members in their leagues" ON public.league_members
  FOR SELECT USING (public.is_league_member(league_id, auth.uid()));

CREATE POLICY "Authenticated users can join leagues" ON public.league_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave leagues" ON public.league_members
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - DAILY THROWS
-- =====================================================

DROP POLICY IF EXISTS "Members can view throws in their leagues" ON public.daily_throws;
DROP POLICY IF EXISTS "Users can insert their own throws" ON public.daily_throws;
DROP POLICY IF EXISTS "Users can update their own throws" ON public.daily_throws;

CREATE POLICY "Members can view throws in their leagues" ON public.daily_throws
  FOR SELECT USING (public.is_league_member(league_id, auth.uid()));

CREATE POLICY "Users can insert their own throws" ON public.daily_throws
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_league_member(league_id, auth.uid()));

CREATE POLICY "Users can update their own throws" ON public.daily_throws
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - FRIENDSHIPS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete their own friendships" ON public.friendships;

CREATE POLICY "Users can view their own friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendships" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- =====================================================
-- RLS POLICIES - FRIEND REQUESTS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can update requests sent to them" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.friend_requests;

CREATE POLICY "Users can view their own friend requests" ON public.friend_requests
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send friend requests" ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update requests sent to them" ON public.friend_requests
  FOR UPDATE USING (auth.uid() = to_user_id);

CREATE POLICY "Users can delete their own requests" ON public.friend_requests
  FOR DELETE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- =====================================================
-- RLS POLICIES - LEAGUE INVITES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own league invites" ON public.league_invites;
DROP POLICY IF EXISTS "League members can send invites" ON public.league_invites;
DROP POLICY IF EXISTS "Recipients can update invites" ON public.league_invites;
DROP POLICY IF EXISTS "Users can delete their invites" ON public.league_invites;

CREATE POLICY "Users can view their own league invites" ON public.league_invites
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "League members can send invites" ON public.league_invites
  FOR INSERT WITH CHECK (auth.uid() = from_user_id AND is_league_member(league_id, auth.uid()));

CREATE POLICY "Recipients can update invites" ON public.league_invites
  FOR UPDATE USING (auth.uid() = to_user_id);

CREATE POLICY "Users can delete their invites" ON public.league_invites
  FOR DELETE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- =====================================================
-- RLS POLICIES - MATCHES
-- =====================================================

DROP POLICY IF EXISTS "Players can view their matches" ON public.matches;
DROP POLICY IF EXISTS "Users can create matches" ON public.matches;
DROP POLICY IF EXISTS "Players can update their matches" ON public.matches;

CREATE POLICY "Players can view their matches" ON public.matches
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Users can create matches" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Players can update their matches" ON public.matches
  FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- =====================================================
-- RLS POLICIES - MATCH THROWS
-- =====================================================

DROP POLICY IF EXISTS "Players can view match throws" ON public.match_throws;
DROP POLICY IF EXISTS "Players can insert their throws" ON public.match_throws;

CREATE POLICY "Players can view match throws" ON public.match_throws
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = match_throws.match_id
      AND (matches.player1_id = auth.uid() OR matches.player2_id = auth.uid())
    )
  );

CREATE POLICY "Players can insert their throws" ON public.match_throws
  FOR INSERT WITH CHECK (auth.uid() = player_id);

-- =====================================================
-- RLS POLICIES - MATCH SIGNALS
-- =====================================================

DROP POLICY IF EXISTS "Match participants can view signals" ON public.match_signals;
DROP POLICY IF EXISTS "Match participants can send signals" ON public.match_signals;

CREATE POLICY "Match participants can view signals" ON public.match_signals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_signals.match_id
        AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
    )
  );

CREATE POLICY "Match participants can send signals" ON public.match_signals
  FOR INSERT WITH CHECK (
    from_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_signals.match_id
        AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
        AND (m.player1_id = to_user_id OR m.player2_id = to_user_id)
        AND to_user_id <> auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - HEAD TO HEAD
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own head_to_head records" ON public.head_to_head;

CREATE POLICY "Users can view their own head_to_head records" ON public.head_to_head
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- =====================================================
-- RLS POLICIES - TOURNAMENTS
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view public tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Creators can view their tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Participants can view their tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Creators can update their tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Creators can delete their tournaments" ON public.tournaments;

CREATE POLICY "Anyone can view public tournaments" ON public.tournaments
  FOR SELECT USING (is_public = true);

CREATE POLICY "Creators can view their tournaments" ON public.tournaments
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Participants can view their tournaments" ON public.tournaments
  FOR SELECT USING (public.is_tournament_participant(id, auth.uid()));

CREATE POLICY "Users can create tournaments" ON public.tournaments
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their tournaments" ON public.tournaments
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their tournaments" ON public.tournaments
  FOR DELETE USING (auth.uid() = created_by);

-- =====================================================
-- RLS POLICIES - TOURNAMENT PARTICIPANTS
-- =====================================================

DROP POLICY IF EXISTS "View participants of public tournaments" ON public.tournament_participants;
DROP POLICY IF EXISTS "View own participation" ON public.tournament_participants;
DROP POLICY IF EXISTS "Creators can view their tournament participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Users can join open public tournaments" ON public.tournament_participants;
DROP POLICY IF EXISTS "Creators can insert participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Creators can update participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Creators can delete participants" ON public.tournament_participants;

CREATE POLICY "View participants of public tournaments" ON public.tournament_participants
  FOR SELECT USING (public.is_tournament_public(tournament_id));

CREATE POLICY "View own participation" ON public.tournament_participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Creators can view their tournament participants" ON public.tournament_participants
  FOR SELECT USING (public.is_tournament_creator(tournament_id, auth.uid()));

CREATE POLICY "Users can join open public tournaments" ON public.tournament_participants
  FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_tournament_open_and_public(tournament_id));

CREATE POLICY "Creators can insert participants" ON public.tournament_participants
  FOR INSERT WITH CHECK (public.is_tournament_creator(tournament_id, auth.uid()));

CREATE POLICY "Creators can update participants" ON public.tournament_participants
  FOR UPDATE USING (public.is_tournament_creator(tournament_id, auth.uid()));

CREATE POLICY "Creators can delete participants" ON public.tournament_participants
  FOR DELETE USING (public.is_tournament_creator(tournament_id, auth.uid()));

-- =====================================================
-- RLS POLICIES - TOURNAMENT MATCHES
-- =====================================================

DROP POLICY IF EXISTS "View matches of public tournaments" ON public.tournament_matches;
DROP POLICY IF EXISTS "Participants can view their tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Creators can view their tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Creators can insert matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Creators can update matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Creators can delete matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Participants can update their matches" ON public.tournament_matches;

CREATE POLICY "View matches of public tournaments" ON public.tournament_matches
  FOR SELECT USING (public.is_tournament_public(tournament_id));

CREATE POLICY "Participants can view their tournament matches" ON public.tournament_matches
  FOR SELECT USING (public.is_tournament_participant(tournament_id, auth.uid()));

CREATE POLICY "Creators can view their tournament matches" ON public.tournament_matches
  FOR SELECT USING (public.is_tournament_creator(tournament_id, auth.uid()));

CREATE POLICY "Creators can insert matches" ON public.tournament_matches
  FOR INSERT WITH CHECK (public.is_tournament_creator(tournament_id, auth.uid()));

CREATE POLICY "Creators can update matches" ON public.tournament_matches
  FOR UPDATE USING (public.is_tournament_creator(tournament_id, auth.uid()));

CREATE POLICY "Creators can delete matches" ON public.tournament_matches
  FOR DELETE USING (public.is_tournament_creator(tournament_id, auth.uid()));

CREATE POLICY "Participants can update their matches" ON public.tournament_matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tournament_participants tp
      WHERE tp.tournament_id = tournament_id AND tp.user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - TOURNAMENT INVITES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their tournament invites" ON public.tournament_invites;
DROP POLICY IF EXISTS "Tournament creators can send invites" ON public.tournament_invites;
DROP POLICY IF EXISTS "Recipients can update invites" ON public.tournament_invites;
DROP POLICY IF EXISTS "Users can delete their invites" ON public.tournament_invites;

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

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_head_to_head()
RETURNS TRIGGER AS $$
DECLARE
  p1_id UUID;
  p2_id UUID;
  winner_id UUID;
  h2h_id UUID;
BEGIN
  IF NEW.status = 'completed' AND NEW.player2_id IS NOT NULL THEN
    IF NEW.player1_id < NEW.player2_id THEN
      p1_id := NEW.player1_id;
      p2_id := NEW.player2_id;
      winner_id := NEW.winner_id;
    ELSE
      p1_id := NEW.player2_id;
      p2_id := NEW.player1_id;
      winner_id := NEW.winner_id;
    END IF;

    INSERT INTO public.head_to_head (player1_id, player2_id)
    VALUES (p1_id, p2_id)
    ON CONFLICT (player1_id, player2_id) DO NOTHING
    RETURNING id INTO h2h_id;

    IF h2h_id IS NULL THEN
      SELECT id INTO h2h_id FROM public.head_to_head
      WHERE player1_id = p1_id AND player2_id = p2_id;
    END IF;

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

CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.matches WHERE created_at < (now() - interval '1 month');

  DELETE FROM public.matches
  WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id)
  AND id NOT IN (
    SELECT id FROM public.matches
    WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id)
    ORDER BY created_at DESC LIMIT 10
  );

  IF NEW.player2_id IS NOT NULL THEN
    DELETE FROM public.matches
    WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id)
    AND id NOT IN (
      SELECT id FROM public.matches
      WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id)
      ORDER BY created_at DESC LIMIT 10
    );
  END IF;

  DELETE FROM public.friend_requests WHERE created_at < (now() - interval '1 month') OR status != 'pending';
  DELETE FROM public.league_invites WHERE created_at < (now() - interval '1 month') OR status != 'pending';
  DELETE FROM public.tournament_invites WHERE created_at < (now() - interval '1 month') OR status != 'pending';

  DELETE FROM public.tournaments WHERE status = 'completed' AND completed_at < (now() - interval '1 hour');
  DELETE FROM public.tournaments WHERE (status = 'open' OR status = 'scheduled') AND created_at < (now() - interval '48 hours');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_completed ON public.matches;
CREATE TRIGGER on_match_completed
  AFTER UPDATE OF status ON public.matches
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.update_head_to_head();

DROP TRIGGER IF EXISTS on_match_cleanup ON public.matches;
CREATE TRIGGER on_match_cleanup
  AFTER INSERT OR UPDATE OF status ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_data();

-- =====================================================
-- REALTIME
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'match_throws'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_throws;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'match_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_signals;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tournaments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tournament_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_participants;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tournament_matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;
  END IF;
END $$;

-- =====================================================
-- STORAGE BUCKET FOR VIDEOS
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('throw-videos', 'throw-videos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own videos" ON storage.objects;
DROP POLICY IF EXISTS "League members can view throw videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;

CREATE POLICY "Users can upload their own videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'throw-videos'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can update their own videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'throw-videos'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "League members can view throw videos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'throw-videos'
    AND public.is_league_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "Users can delete their own videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'throw-videos'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- Done!
SELECT 'Schema restored successfully!' as result;
