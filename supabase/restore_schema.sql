-- =====================================================
-- DARTSTREAK SCHEMA RESTORE (LEAGUES ONLY)
-- Run this in Supabase SQL Editor to restore league schema
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
-- CLEANUP FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean up old non-pending friend requests (older than 1 month or not pending)
  DELETE FROM public.friend_requests 
  WHERE created_at < (now() - interval '1 month') OR status != 'pending';
  
  -- Clean up old non-pending league invites (older than 1 month or not pending)
  DELETE FROM public.league_invites 
  WHERE created_at < (now() - interval '1 month') OR status != 'pending';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for cleanup
DROP TRIGGER IF EXISTS on_league_cleanup ON public.league_invites;
CREATE TRIGGER on_league_cleanup
  AFTER INSERT OR UPDATE ON public.league_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_data();

-- =====================================================
-- REALTIME
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'leagues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leagues;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'league_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.league_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'daily_throws'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_throws;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'friendships'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'friend_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'league_invites'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.league_invites;
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
