-- Create profiles table for user display names
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create trigger function for new users
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Leagues table
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 6),
  total_rounds INTEGER NOT NULL DEFAULT 4,
  current_round INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

-- League members table
CREATE TABLE public.league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);

ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

-- Daily throws table (9 throws per day = 3 rounds of 3 darts)
CREATE TABLE public.daily_throws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id, throw_date)
);

ALTER TABLE public.daily_throws ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leagues
CREATE POLICY "Users can view leagues they are members of"
ON public.leagues FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.league_members 
    WHERE league_members.league_id = leagues.id 
    AND league_members.user_id = auth.uid()
  )
  OR created_by = auth.uid()
);

CREATE POLICY "Authenticated users can create leagues"
ON public.leagues FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "League creators can update their leagues"
ON public.leagues FOR UPDATE
USING (auth.uid() = created_by);

-- RLS Policies for league_members
CREATE POLICY "Members can view other members in their leagues"
ON public.league_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.league_members lm
    WHERE lm.league_id = league_members.league_id
    AND lm.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can join leagues"
ON public.league_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave leagues"
ON public.league_members FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for daily_throws
CREATE POLICY "Members can view throws in their leagues"
ON public.daily_throws FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_members.league_id = daily_throws.league_id
    AND league_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own throws"
ON public.daily_throws FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_members.league_id = daily_throws.league_id
    AND league_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own throws"
ON public.daily_throws FOR UPDATE
USING (auth.uid() = user_id);