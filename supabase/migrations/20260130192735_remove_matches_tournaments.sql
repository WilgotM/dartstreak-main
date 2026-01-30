-- =====================================================
-- DROP MATCH & TOURNAMENT TABLES
-- Migration: Remove all match and tournament functionality
-- Date: 2026-01-30
-- =====================================================

-- Step 1: Drop Triggers
DROP TRIGGER IF EXISTS on_match_completed ON public.matches;
DROP TRIGGER IF EXISTS on_match_cleanup ON public.matches;

-- Step 2: Drop Functions
DROP FUNCTION IF EXISTS public.update_head_to_head() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_data() CASCADE;
DROP FUNCTION IF EXISTS public.is_tournament_creator(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_tournament_participant(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_tournament_public(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_tournament_open_and_public(UUID) CASCADE;

-- Step 3: Drop Tables (in dependency order)
DROP TABLE IF EXISTS public.match_signals CASCADE;
DROP TABLE IF EXISTS public.match_throws CASCADE;
DROP TABLE IF EXISTS public.tournament_matches CASCADE;
DROP TABLE IF EXISTS public.tournament_invites CASCADE;
DROP TABLE IF EXISTS public.tournament_participants CASCADE;
DROP TABLE IF EXISTS public.head_to_head CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.tournaments CASCADE;

-- Step 4: Recreate cleanup function (league-only version)
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

-- Step 5: Create trigger for league-based cleanup
-- Trigger on league_invites to run cleanup periodically
DROP TRIGGER IF EXISTS on_league_cleanup ON public.league_invites;
CREATE TRIGGER on_league_cleanup
  AFTER INSERT OR UPDATE ON public.league_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_data();

-- Step 6: Remove matches from realtime publication if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.matches;
  END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration worked:
-- 
-- List all tables (should not include match/tournament tables):
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
--
-- List all functions (should not include tournament or match functions):
-- SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace ORDER BY proname;
