-- Add offline mode and legs/sets support to matches table
ALTER TABLE public.matches
ADD COLUMN is_offline boolean NOT NULL DEFAULT false,
ADD COLUMN legs_to_win integer NOT NULL DEFAULT 1,
ADD COLUMN sets_to_win integer NOT NULL DEFAULT 1,
ADD COLUMN player1_legs integer NOT NULL DEFAULT 0,
ADD COLUMN player2_legs integer NOT NULL DEFAULT 0,
ADD COLUMN player1_sets integer NOT NULL DEFAULT 0,
ADD COLUMN player2_sets integer NOT NULL DEFAULT 0;